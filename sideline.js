define([
    'jquery',
    'base/js/namespace',
], function (
    $,
    Jupyter,
) {
    // hacky way to add custom css styles, didnt get it to work another way so far
    var load_css = function () {
        var style = document.createElement("style");
        style.type = "text/css"
        style.innerHTML = "\n"
            + ".sideline-active {box-shadow: inset 0px 0px 3px 3px rgba(15,160,196,0.75)}"
            + "\n";
        document.head.appendChild(style);
    };

    // load the extension
    var initialize = function() {

        //console.log("[sideline] Loading sideline.css");
        //load_css('./sideline.css')
        load_css();

        // initial state
        let is_screen_split = false;
        let highest_pindex = 1;

        // pin any cells that are marked after inital load
        function pin_tagged_cells() {
            let cells = Jupyter.notebook.get_cells();
            let cells_to_pin = [];

            for (cell in cells) {
                let line = Jupyter.notebook.get_cell(cell).code_mirror.getLine(0);
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
                }

            }
            
            // pin the remembered cells
            for (let i=0; i<cells_to_pin.length; i++) {
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
            cellObj.attr('id', 'subplot-'+name);
        }

        // pin a new cell to the sideline-container and apply styles
        function pin_new_cell(cell) {
            let tag_str = "#sideline - subplot " + highest_pindex + "\n";
            var cm_original = cell.code_mirror;

            // prepend first line to tag the cell as a subplot if it isn't already tagged
            if (!cm_original.getLine(cm_original.firstLine()).startsWith("#sideline - subplot ")) {
                cm_original.replaceRange(tag_str, CodeMirror.Pos(cm_original.firstLine()-1));
            }

            // insert a cell above the selected cell, and set its value
            Jupyter.notebook.insert_cell_above().code_mirror.setValue("#sideline - go to subplot " + highest_pindex);

            // add listener/button to scroll the apropriate subplot (cell) into view
            set_click_listener_scroll(Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell)-1), highest_pindex);
            
            // todo: add button to hide the apropriate subplot?

            let cellObj = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));

            $('#sideline-container').append(cellObj)
            cellObj.addClass('sideline-pinned');
            cellObj.attr('id', 'subplot-'+highest_pindex);

            // scroll to the cell that was just pinned
            document.getElementById('subplot-'+highest_pindex).scrollIntoView();

            highest_pindex++;
        }

        // set the click()-listener to scroll to the apropriate subplot 
        function set_click_listener_scroll(ref, name) {
            ref.find('.input').append('<button id="sideline-goto-'+name+'" style="position:absolute" class="btn btn-default sideline-btn"><i class="fa fa-arrow-circle-right" aria-hidden="true"></i></button>')
            ref.find('#sideline-goto-'+name).click(function() {
                document.getElementById('subplot-'+name).scrollIntoView();
            })
        }

        // set the click()-listener to hide the apropriate subplot 
        function set_click_listener_hide(ref, name) {
            ref.find('.input').append('<button id="sideline-toggle-'+name+'" style="position:absolute" class="btn btn-default sideline-btn"><i class="fa fa-toggle-on" aria-hidden="true"></i><i class="fa fa-toggle-off" aria-hidden="true" style="display: none;"></i></button>')
            ref.find('#sideline-toggle-'+name).click(function() {
                let target = document.getElementById('subplot-'+name);
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
                    var arg = Jupyter.notebook.get_selected_cell().code_mirror.getLine(0).replace( /^\D+/g, '');
                    return '<button id="sideline-goto-'+arg+'" style="position:absolute" class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
                } else {
                    return '<button style="position:absolute" class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
                }
            });
        }

        // todo: deprecated?
        // add buttons to scroll markers
        function add_scroll_buttons() {
            // todo: refactor this code to use Jupyter.notebook stuff instead of jquery, also only call once when pinned

            // add buttons
            $('.input').append(function () {
                if (get_first_line($(this)).startsWith("#sideline - scroll to subplot ")) {
                    var arg = get_first_line($(this)).replace( /^\D+/g, '');
                    return '<button id="sideline-goto-'+arg+'" style="position:absolute" class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
                } 
            });
            // set click()-listeners
            $('.input').each(function () {
                if (get_first_line($(this)).startsWith("#sideline - scroll to subplot ")) {
                    var arg = get_first_line($(this)).replace( /^\D+/g, '');
                    $(this).find('[id^="sideline-goto-"]').click(function () {
                        document.getElementById('subplot-'+arg).scrollIntoView();
                    });
                }
            });
        }
        
        // todo: deprecated?
        //get first line of code text from input cell, thisObj needs to be a $(this) of $('.input')
        function get_first_line(thisObj) {
            return thisObj.find('.CodeMirror-line').first().children().first().text();
        }

        // split the screen to make space for pinned elements on the side
        function split_screen() {
            // todo: use classes instead of style
            $('#notebook').css({ 'display': 'flex' });
            $('#notebook-container').css({ 'width': '50vw', 'margin-left': '3vw', 'margin-right': '3vw' });
            if ($('#sideline-container').length) {
                show_sideline_container();
            } else {
                insert_sideline_container();
            }
            is_screen_split = true;
        }

        // reset the layout to the default
        function reset_nb_width() {
            // todo: update once split_screen() uses classes instead of style
            $('#notebook').css({ 'display': '' })
            $('#notebook-container').css({ 'width': '', 'margin-left': '', 'margin-right': '', 'display': '' });
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

        /* button click-listeners */

        // set click()-listeners to pin
        function set_pin_listener() {
            $('.sideline-btn').off('click')
            $('.sideline-btn').click(function () {
                if (is_screen_split == false) split_screen();

                pin_new_cell($(this).parent().parent());

                // todo: hook if result is refreshed to refresh popout
            });
        }

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

        /* sideline-container methods */

        function insert_sideline_container() {
            $('#notebook-container').append('<div id="sideline-container"></div>');
            $('#sideline-container').css({
                'width': '41vw',
                'margin-right': '3vw',
                'margin-top': '20px',
                'padding': '15px',
                'background-color': '#fff',
                'min-height': '0',
                'box-shadow': '0px 0px 12px 1px rgba(87, 87, 87, 0.2)',
                'position': 'fixed',
                'right': '0',
                'top': get_header_height(),
                'overflow-y': 'auto',
                'max-height': '80vh',
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

        var unpin_handler = function() {
            // todo
        }

        // toggle visibility of sideline and layout
        var hide_container_handler = function() {
            if ($('#sideline-container').css('display') == 'none') {
                split_screen();
                show_sideline_container();
            } else {
                hide_sideline_container();
                reset_nb_width();
            }
        }

        var pin_action = {
            icon: 'fa-thumb-tack', // a font-awesome class used on buttons, etc
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
        var pin_action_name = Jupyter.actions.register(pin_action, 'pin', prefix); // returns 'sideline:pin'
        var unpin_action_name = Jupyter.actions.register(unpin_action, 'unpin', prefix); // returns 'sideline:pin'
        var hide_container_action_name = Jupyter.actions.register(hide_container_action, 'hide_container', prefix); // returns 'sideline:hide_container'
        Jupyter.toolbar.add_buttons_group([pin_action_name, unpin_action_name, hide_container_action_name]);
    }

    var load_ipython_extension = function () {
        Jupyter.notebook.events.on('notebook_loaded.Notebook', initialize())
    };

    return {
        load_ipython_extension: load_ipython_extension
    };
});