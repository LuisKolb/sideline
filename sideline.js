define([
    'jquery',
    'base/js/namespace',
    'require',
], function (
    $,
    Jupyter,
    requirejs,
) {

    // function to load css from a file name in the same directory
    var load_css = function (arg) {
        var link = $('<link/>')
        $('head').append(link)
        link.attr('href', requirejs.toUrl('./' + arg + '.css'))
            .attr('rel', 'stylesheet')
            .attr('type', 'text/css');
    };

    // push a tag to a cell's metadata.tags
    var write_tag = function (cell, name) {
        // Add to metadata
        if (cell.metadata.tags === undefined) {
            cell.metadata.tags = [];
        } else if (cell.metadata.tags.indexOf(name) !== -1) {
            // Tag already exists
            return false;
        }
        cell.metadata.tags.push(name);

        cell.events.trigger('set_dirty.Notebook', { value: true });
        return true;
    };

    // remove a tag from a cell's metadata.tags
    var remove_tags = function (cell) {
        delete cell.metadata.tags;
        cell.events.trigger('set_dirty.Notebook', { value: true });
        return true;
    };

    var read_tags = function (cell) {
        return cell.metadata.tags;
    }

    // return the first found sideline tag (and only the tag)
    var get_sideline_tag = function (cell) {
        for (tag of cell.metadata.tags) {
            if (tag.startsWith("subplot-")) {
                return tag.split("-")[1]
            }
        }
        return false;
    }

    // load the extension
    var initialize = function () {

        console.log("[sideline] Loading sideline.css");
        load_css('sideline');

        // initial state
        let is_screen_split = false;
        let highest_pindex = 1;

        // pin any cells that are marked after inital load
        function pin_tagged_cells() {
            let cells = Jupyter.notebook.get_cells();
            let cells_to_pin = [];

            for (cell in cells) {

                let line = Jupyter.notebook.get_cell(cell).code_mirror.getLine(0);
                console.log(line)
                if (line.startsWith('#sideline - subplot ')) {
                    // cells that are subplots themself

                    let name = line.split('#sideline - subplot ')[1]
                    // check if the subplot name is an int and increase the tracker
                    if (Number.isInteger(parseFloat(name))) {
                        highest_pindex = parseFloat(name) + 1;
                    }
                    // remember cells and pin later, since pinning here would skip every second cell because indices change
                    cells_to_pin.push([Jupyter.notebook.get_cell_element(cell), name])

                } else if (line.startsWith('#sideline - go to subplot ')) {
                    // cells that are supposed to scroll to the apropriate subplot

                    let name = line.split('#sideline - go to subplot ')[1]
                    set_click_listener_scroll(Jupyter.notebook.get_cell_element(cell), name)

                } else if (line.startsWith('#sideline - toggle subplot ')) {
                    // cells that are supposed to hide the apropriate subplot

                    let name = line.split('#sideline - toggle subplot ')[1]
                    set_click_listener_hide(Jupyter.notebook.get_cell_element(cell), name)
                } else if (Jupyter.notebook.get_cell(cell).metadata.tags && get_sideline_tag(Jupyter.notebook.get_cell(cell))) {
                    // cells that are subplots themself

                    let name = get_sideline_tag(Jupyter.notebook.get_cell(cell))
                    // check if the subplot name is an int and increase the tracker
                    if (Number.isInteger(parseFloat(name))) {
                        highest_pindex = parseFloat(name) + 1;
                    }
                    // remember cells and pin later, since pinning here would skip every second cell because indices change
                    cells_to_pin.push([Jupyter.notebook.get_cell_element(cell), name])
                } else if (line.startsWith('#sideline - link to subplot ')) {
                    let name = line.split('#sideline - link to subplot ')[1]
                    add_container_with_buttons(Jupyter.notebook.get_cell_element(cell), name)
                }

            }

            // pin the remembered cells
            for (let i = 0; i < cells_to_pin.length; i++) {
                pin_tagged_cell(cells_to_pin[i][0], cells_to_pin[i][1])
            }
        }

        function pin_tagged_cell(cellObj, name) {
            if (!is_screen_split) {
                split_screen()
            }
            // todo: check if cell with id already exists, and pin below it to keep subplots together
            $('#sideline-container').append(cellObj)
            cellObj.addClass('sideline-pinned');
            cellObj.attr('id', 'subplot-' + name);
        }

        // pin a new cell to the sideline-container and apply styles
        function pin_new_cell(cell) {
            let cellObj = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));

            if (!cellObj.hasClass('sideline-pinned')) {
                // insert a markdown-cell above the selected cell, and set its value
                var md_reference_cell = Jupyter.notebook.insert_cell_above('markdown');
                md_reference_cell.unrender();
                md_reference_cell.code_mirror.setValue("#sideline - link to subplot " + highest_pindex);
                md_reference_cell.render();

                // add button container next to the md-cell
                add_container_with_buttons(Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(md_reference_cell)), highest_pindex);

                // add sideline markers/metadata 
                write_tag(cell, "subplot-" + highest_pindex)
                cellObj.addClass('sideline-pinned');
                cellObj.attr('id', 'subplot-' + highest_pindex);
                $('#sideline-container').append(cellObj)
                
                // scroll to the cell that was just pinned
                document.getElementById('subplot-' + highest_pindex).scrollIntoView();

                highest_pindex++;
            }
        }

        // add a button container and set onclicks
        function add_container_with_buttons(ref, name) {
            ref.prepend('<div class="sideline-btn-container">'
                + '<button id="sideline-toggle-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-toggle-on" aria-hidden="true"></i><i class="fa fa-toggle-off" aria-hidden="true" style="display: none;"></i></button>'
                + '<button id="sideline-goto-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-arrow-circle-right" aria-hidden="true"></i></button>'
                + '</div>')
            ref.find('#sideline-goto-' + name).click(function () {
                var subplot = document.getElementById('subplot-' + name);
                subplot.scrollIntoView();
                // blinking animation
                var count = 0;
                var x = setInterval(function () {
                    $('#subplot-' + name).toggleClass('background-hint');
                    if (count >= 3) clearInterval(x);
                    count++;
                }, 500)
            })
            ref.find('#sideline-toggle-' + name).click(function () {
                let target = document.getElementById('subplot-' + name);
                if (target.style.display == 'none') {
                    target.style.display = 'block';
                    $(this).find('i.fa-toggle-on').show();
                    $(this).find('i.fa-toggle-off').hide();
                } else {
                    target.style.display = 'none';
                    $(this).find('i.fa-toggle-on').hide();
                    $(this).find('i.fa-toggle-off').show();
                }
            })

        }

        // split the screen to make space for pinned elements on the side
        function split_screen() {
            $('#notebook').css({ 'display': 'flex' });
            $('#notebook-container').addClass('nb-container');
            if ($('#sideline-container').length) {
                show_sideline_container();
            } else {
                insert_sideline_container();
            }
            is_screen_split = true;
        }

        // reset the layout to the default
        function reset_nb_width() {
            $('#notebook').css({ 'display': '' })
            $('#notebook-container').removeClass('nb-container');
            hide_sideline_container();
            is_screen_split = false;
        }

        // reset layout if no cells remain pinned
        function check_if_any_pinned() {
            if ($('.sideline-pinned').length == 0) {
                reset_nb_width();
            }
        }

        // get height of the header to align items below
        function get_header_height() {
            return $('#header').height() + 'px';
        }

        /* sideline-container methods */

        function insert_sideline_container() {
            $('#notebook-container').append('<div id="sideline-container" class="sl-container"></div>');
            $('#sideline-container').css({
                'top': get_header_height(),
            });
        }

        function hide_sideline_container() {
            $('#sideline-container').hide()
        }

        function show_sideline_container() {
            $('#sideline-container').show()
        }

        // execute upon loading
        pin_tagged_cells();

        // add a resize listener since jupyter will change some styles on resize
        $(window).resize(function () {
            if (is_screen_split) split_screen();
        });

        /* add and register jupyter actions */

        // pin selected cell to sideline-container
        var pin_handler = function () {
            // if screen is not already split, do that
            if (!is_screen_split) {
                split_screen();
            }

            // for all selected cells, pin them to the side
            pin_new_cell(Jupyter.notebook.get_selected_cell())
        };

        // unpin selected cell, remove markers and tage as well as referencing "link"-cells
        var unpin_handler = function () {
            var cell = Jupyter.notebook.get_selected_cell();
            var name = get_sideline_tag(cell);
            var jq_ref = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));

            // insert after first found 
            var ref_link = $('#sideline-toggle-' + name);
            if (ref_link.length > 0) {
                ref_link.first().parent().parent().after(jq_ref);
                ref_link.parent().parent().remove();
            } else {
                // if no link is found, append aat end of nb
                $('#notebook-container').append(ref_subplot);
            }

            // remove sideline markers and metadata
            jq_ref.removeClass('sideline-pinned');
            jq_ref.removeAttr('id');
            remove_tags(cell);

            check_if_any_pinned();
        }

        // toggle visibility of sideline and toggle layout
        var hide_container_handler = function () {
            if ($('#sideline-container').css('display') == 'none') {
                split_screen();
                show_sideline_container();
            } else {
                hide_sideline_container();
                reset_nb_width();
            }
        }

        var pin_action = {
            icon: 'fa-thumb-tack',
            help: 'Pin to Sideline',
            help_index: 'zz',
            handler: pin_handler
        };

        var unpin_action = {
            icon: 'fa-ban',
            help: 'Unpin the selected Cell',
            help_index: 'zz',
            handler: unpin_handler
        }

        var hide_container_action = {
            icon: 'fa-eye-slash',
            help: 'Hide Sideline',
            help_index: 'zz',
            handler: hide_container_handler
        }

        var prefix = 'sideline';
        var pin_action_name = Jupyter.actions.register(pin_action, 'pin', prefix);
        var unpin_action_name = Jupyter.actions.register(unpin_action, 'unpin', prefix);
        var hide_container_action_name = Jupyter.actions.register(hide_container_action, 'hide_container', prefix);
        Jupyter.toolbar.add_buttons_group([pin_action_name, unpin_action_name, hide_container_action_name]);
    }

    var load_ipython_extension = function () {
        Jupyter.notebook.events.on('notebook_loaded.Notebook', initialize())
    };

    return {
        load_ipython_extension: load_ipython_extension
    };





    /* deprecated methods, just in case */

    // todo: deprecated?
    // set the click()-listener to scroll to the apropriate subplot 
    function set_click_listener_scroll(ref, name) {
        ref.find('.input').append('<button id="sideline-goto-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-arrow-circle-right" aria-hidden="true"></i></button>')
        ref.find('#sideline-goto-' + name).click(function () {
            document.getElementById('subplot-' + name).scrollIntoView();
        })
    }

    // todo: deprecated?
    // set the click()-listener to hide the apropriate subplot 
    function set_click_listener_hide(ref, name) {
        ref.find('.input').append('<button id="sideline-toggle-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-toggle-on" aria-hidden="true"></i><i class="fa fa-toggle-off" aria-hidden="true" style="display: none;"></i></button>')
        ref.find('#sideline-toggle-' + name).click(function () {
            let target = document.getElementById('subplot-' + name);
            if (target.style.display == 'none') {
                target.style.display = 'block';
                $(this).find('i.fa-toggle-on').show();
                $(this).find('i.fa-toggle-off').hide();
            } else {
                target.style.display = 'none';
                $(this).find('i.fa-toggle-on').hide();
                $(this).find('i.fa-toggle-off').show();
            }
        })
    }

    // todo: deprecated?
    // add buttons to outputs
    function add_buttons() {
        let i = 0;
        $('.input').append(function () {
            if (get_first_line($(this)) == "​") {
                // no button should be added for empty code cells
                return ('');
            } else if (get_first_line($(this)).substring(0, 17) == "#sideline-disable") {
                // disable button with a comment
                return '';
            } else if (get_first_line($(this)).startsWith("#sideline - scroll to subplot ")) {
                var arg = Jupyter.notebook.get_selected_cell().code_mirror.getLine(0).replace(/^\D+/g, '');
                return '<button id="sideline-goto-' + arg + '" class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
            } else {
                return '<button class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
            }
        });
    }

    // todo: deprecated?
    // add buttons to scroll markers
    function add_scroll_buttons() {
        // add buttons
        $('.input').append(function () {
            if (get_first_line($(this)).startsWith("#sideline - scroll to subplot ")) {
                var arg = get_first_line($(this)).replace(/^\D+/g, '');
                return '<button id="sideline-goto-' + arg + '" class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
            }
        });
        // set click()-listeners
        $('.input').each(function () {
            if (get_first_line($(this)).startsWith("#sideline - scroll to subplot ")) {
                var arg = get_first_line($(this)).replace(/^\D+/g, '');
                $(this).find('[id^="sideline-goto-"]').click(function () {
                    document.getElementById('subplot-' + arg).scrollIntoView();
                });
            }
        });
    }

    // todo: deprecated?
    //get first line of code text from input cell, thisObj needs to be a $(this) of $('.input')
    function get_first_line(thisObj) {
        return thisObj.find('.CodeMirror-line').first().children().first().text();
    }

    // todo: deprecated?
    // set click()-listeners to pin
    function set_pin_listener() {
        $('.sideline-btn').off('click')
        $('.sideline-btn').click(function () {
            if (is_screen_split == false) split_screen();

            pin_new_cell($(this).parent().parent());

            // todo: hook if result is refreshed to refresh popout
        });
    }

    // todo: deprecated?
    // set click()-listeners to unpin and reset cell styles
    function set_unpin_listener(cellObj) {
        cellObj.find('.sideline-btn').off('click')
        cellObj.find('.sideline-btn').click(function () {
            $(this).parent().parent().removeAttr('style');
            $(this).parent().parent().removeClass('sideline-pinned');
            $(this).removeClass('sideline-active')
            check_if_any_pinned();
            set_pin_listener();
        });
    }
});