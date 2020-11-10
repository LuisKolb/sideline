define([
    'jquery',
    'base/js/namespace',
    'require',
], function (
    $,
    Jupyter,
    requirejs,
) {
    // initial state
    var is_screen_split = false;
    var highest_pindex = 1;

    // function to load css from a file name in the same directory
    var load_css = function (arg) {
        var link = $('<link/>')
        $('head').append(link)
        link.attr('href', requirejs.toUrl('./' + arg + '.css'))
            .attr('rel', 'stylesheet')
            .attr('type', 'text/css');
    };

    /* functions copied from tags.js in the Jupyter Notebook Github repository */

    var make_tag = function (name, on_remove, is_editable) {
        var tag_UI = $('<span/>')
            .addClass('cell-tag')
            .text(name);

        if (is_editable) {
            var remove_button = $('<i/>')
                .addClass('remove-tag-btn')
                .addClass('fa fa-times')
                .click(function () {
                    on_remove(name);
                    return false;
                });
            tag_UI.append(remove_button);
        }
        return tag_UI;
    };

    var write_tag = function (cell, name, add) {
        if (add) {
            // Add to metadata
            if (cell.metadata.tags === undefined) {
                cell.metadata.tags = [];
            } else if (cell.metadata.tags.indexOf(name) !== -1) {
                // Tag already exists
                return false;
            }
            cell.metadata.tags.push(name);
        } else {
            // Remove from metadata
            if (!cell.metadata || !cell.metadata.tags) {
                // No tags to remove
                return false;
            }
            // Remove tag from tags list
            var index = cell.metadata.tags.indexOf(name);
            if (index !== -1) {
                cell.metadata.tags.splice(index, 1);
            }
            // If tags list is empty, remove it
            if (cell.metadata.tags.length === 0) {
                delete cell.metadata.tags;
            }
        }
        cell.events.trigger('set_dirty.Notebook', { value: true });
        return true;
    };

    var remove_tag = function (cell, tag_container) {
        return function (name) {

            var changed = write_tag(cell, name, false);
            if (changed) {
                // Remove tag UI
                var tag_map = jQuery.data(tag_container, "tag_map") || {};
                var tag_UI = tag_map[name];
                delete tag_map[name];
                tag_UI.remove();
            }
        };
    };

    var add_tag = function (cell, name, tag_container, on_remove) {
        if (name === '') {
            // Skip empty strings
            return;
        }
        // Write tag to metadata
        var changed = write_tag(cell, name, true);

        if (changed) {
            // Make tag UI
            var tag = make_tag(name, on_remove, cell.is_editable());
            tag_container.append(tag);
            var tag_map = jQuery.data(tag_container, "tag_map") || {};
            tag_map[name] = tag;
            jQuery.data(tag_container, 'tag_map', tag_map);
        }
    };

    /* custom tag functions */

    // return the first found sideline tag (only the tag string)
    var get_sideline_tag = function (cell) {
        if (cell.metadata.tags) {
            for (tag of cell.metadata.tags) {
                if (tag.startsWith("subplot-")) {
                    return tag.split("-")[1];
                } else {
                    return false;
                }
            }
        }
        return false;
    };

    /* pinning functions */

    // pin any cells that are marked after inital load
    var pin_tagged_cells = function () {
        let cells = Jupyter.notebook.get_cells();
        let cells_to_pin = [];

        for (cell in cells) {
            let line = Jupyter.notebook.get_cell(cell).code_mirror.getLine(0);
            if (Jupyter.notebook.get_cell(cell).metadata.tags && get_sideline_tag(Jupyter.notebook.get_cell(cell))) {
                // cells that are subplots themself
                let name = get_sideline_tag(Jupyter.notebook.get_cell(cell))

                // check if the subplot name is a higher int and increase the tracker
                if (Number.isInteger(parseFloat(name)) && parseInt(name) >= highest_pindex) {
                    highest_pindex = parseFloat(name) + 1;
                }

                // remember cells and pin later, since pinning here would skip every second cell because indices change
                cells_to_pin.push([Jupyter.notebook.get_cell_element(cell), name])
            } else if (line.startsWith('sideline - link to subplot ')) {
                let name = line.split('sideline - link to subplot ')[1]
                add_container_with_buttons(Jupyter.notebook.get_cell_element(cell), name)
            }
        }

        var pin_tagged_cell = function (cellObj, name) {
            if (!is_screen_split) {
                split_screen()
            }

            // check if cell with id already exists, and pin below it to keep subplots together
            if ($('.subplot-' + name).length > 0) {
                $('.subplot-' + name).last().after(cellObj);
            } else {
                $('#sideline-container').append(cellObj);
            }

            cellObj.addClass('sideline-pinned');
            cellObj.addClass('subplot-' + name);
        }

        // pin the remembered cells
        for (let i = 0; i < cells_to_pin.length; i++) {
            pin_tagged_cell(cells_to_pin[i][0], cells_to_pin[i][1])
        }
    }

    // pin a new cell to the sideline-container and apply styles
    var pin_new_cell = function (cell) {
        //prevent only already "linking" md-cells from being pinned, don't prevent other md-cells from being pinned
        if (cell.cell_type != 'markdown' || !cell.code_mirror.getLine(0).includes("sideline")) {

            let cellObj = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));
            if (!cellObj.hasClass('sideline-pinned')) {
                // insert a markdown-cell above the selected cell, and set its value
                var md_reference_cell = Jupyter.notebook.insert_cell_above('markdown');
                md_reference_cell.unrender();
                md_reference_cell.code_mirror.setValue("sideline - link to subplot " + highest_pindex);
                md_reference_cell.render();

                // add button container next to the md-cell
                add_container_with_buttons(Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(md_reference_cell)), highest_pindex);

                // add sideline markers/metadata 
                var tag_container = cellObj.find('.tag-container');
                var name = 'subplot-' + highest_pindex;
                add_tag(cell, name, tag_container, remove_tag(cell, tag_container));

                cellObj.addClass('sideline-pinned');
                cellObj.addClass('subplot-' + highest_pindex);
                $('#sideline-container').append(cellObj)

                // scroll to the cell that was just pinned
                document.getElementsByClassName('subplot-' + highest_pindex)[0].scrollIntoView();

                highest_pindex++;
            }
        }
    }

    // add a button container and set onclicks
    var add_container_with_buttons = function (ref, name) {
        ref.prepend('<div class="sideline-btn-container">'
            + '<button id="sideline-toggle-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-toggle-on" aria-hidden="true"></i><i class="fa fa-toggle-off" aria-hidden="true" style="display: none;"></i></button>'
            + '<button id="sideline-goto-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-arrow-circle-right" aria-hidden="true"></i></button>'
            + '</div>')
        ref.find('#sideline-goto-' + name).click(function () {
            document.getElementsByClassName('subplot-' + name)[0].scrollIntoView();
            // blinking animation
            var count = 0;
            var x = setInterval(function () {
                $('.subplot-' + name).toggleClass('background-hint');
                if (count >= 3) clearInterval(x);
                count++;
            }, 500)
        })
        ref.find('#sideline-toggle-' + name).click(function () {
            let targets = document.getElementsByClassName('subplot-' + name);
            for (target of targets) {
                if (target.style.display == 'none') {
                    target.removeAttribute('style') // entirely remove style attribute when toggled visible
                    $(this).find('i.fa-toggle-on').show();
                    $(this).find('i.fa-toggle-off').hide();
                } else {
                    target.style.display = 'none';
                    $(this).find('i.fa-toggle-on').hide();
                    $(this).find('i.fa-toggle-off').show();
                }
            }
        })

    }

    // split the screen to make space for pinned elements on the side
    var split_screen = function () {
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
    var reset_nb_width = function () {
        $('#notebook').css({ 'display': '' })
        $('#notebook-container').removeClass('nb-container');
        hide_sideline_container();
        is_screen_split = false;
    }

    // reset layout if no cells remain pinned
    var check_if_any_pinned = function () {
        if ($('.sideline-pinned').length == 0) {
            reset_nb_width();
        }
    }

    // get height of the header to align items below
    var get_header_height = function () {
        return $('#header').height() + 'px';
    }

    /* sideline-container methods */

    var insert_sideline_container = function () {
        $('#notebook-container').append('<div id="sideline-container" class="sl-container"></div>');
        $('#sideline-container').css({
            'top': get_header_height(),
        });
    }

    var hide_sideline_container = function () {
        $('#sideline-container').hide()
    }

    var show_sideline_container = function () {
        $('#sideline-container').show()
    }

    var observer;
    var current = "";

    // setup listeners
    var setup = function () {
        pin_tagged_cells();

        // save the tags of the two most recently selected subplots
        // need to listen to all nodes to register a cell coming into the container while already being selected
        //      -> cannot limit to #sideline-container
        var target = document.querySelector('#notebook');
        var config = { attributes: true, childList: true, characterData: false, subtree: true, attributeFilter: ['class'] };
        var selection_callback = function (mutations) {
            mutations.forEach(function (mutation) {
                switch (mutation.type) {
                    case "attributes":
                        if (mutation.target.classList.contains('selected')) {
                            for (let i = 0; i < mutation.target.classList.length; i++) {
                                if (mutation.target.classList[i].startsWith('subplot-')) {
                                    current = mutation.target.classList[i];
                                }
                            }
                        }
                        break;
                }
            });
        }

        if (observer) {
            //disconnect observer in case of refresh action
            observer.disconnect();
        }

        observer = new MutationObserver(selection_callback); // instanciate the mutationObserver
        if (target) observer.observe(target, config); // start the observer
        //observer.disconnect();

        // event listener to add tag inserted cells
        Jupyter.notebook.events.on('create.Cell', function (event, data) {
            var cellObj = Jupyter.notebook.get_cell_element(data.index);
            // only add metadata if the element is "pinned"
            if (cellObj.parent('#sideline-container').length > 0) {
                var tag_container = cellObj.find('.tag-container');
                add_tag(data.cell, current, tag_container, remove_tag(data.cell, tag_container));
                cellObj.addClass('sideline-pinned');
                cellObj.addClass(current);
            }
        });

        // add a resize listener since jupyter will change some styles on resize
        $(window).resize(function () {
            if (is_screen_split) split_screen();
        });
    }

    /* jupyter action handlers */

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
        var jq_ref = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));

        // only unpin if the element is "pinned"
        if (jq_ref.parent('#sideline-container').length > 0) {
            var name = get_sideline_tag(cell);
            // insert after first found 
            var ref_link = $('#sideline-toggle-' + name);
            if (ref_link.length > 0) {
                ref_link.first().parent().parent().after(jq_ref);
                ref_link.parent().parent().remove();
            } else {
                // if no link is found, append at end of nb
                $('#sideline-container').before(jq_ref);
            }

            // remove sideline markers and metadata
            jq_ref.removeClass('sideline-pinned');
            jq_ref.removeAttr('id');
            jq_ref.find('.remove-tag-btn').click();

            check_if_any_pinned();
        }
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

// toggle visibility of sideline and toggle layout
var reload_handler = function () {
    setup()
}


// load the extension
var initialize = function () {
    console.log("[sideline] Loading sideline.css");
    load_css('sideline');
    setup();

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

    var reload_action = {
        icon: 'fa-retweet',
        help: 'Reload Sideline',
        help_index: 'zz',
        handler: reload_handler
    }

    var prefix = 'sideline';
    var pin_action_name = Jupyter.actions.register(pin_action, 'pin', prefix);
    var unpin_action_name = Jupyter.actions.register(unpin_action, 'unpin', prefix);
    var hide_container_action_name = Jupyter.actions.register(hide_container_action, 'hide_container', prefix);
    var reload_action_name = Jupyter.actions.register(reload_action, 'reload', prefix);
    Jupyter.toolbar.add_buttons_group([pin_action_name, unpin_action_name, hide_container_action_name, reload_action_name]);
}

var load_ipython_extension = function () {
    Jupyter.notebook.events.on('notebook_loaded.Notebook', initialize())
};

return {
    load_ipython_extension: load_ipython_extension
};
});
