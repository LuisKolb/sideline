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
    function load_ipython_extension() {

        //console.log("[sideline] Loading sideline.css");
        //load_css('./sideline.css')
        load_css();

        // initial state
        let is_screen_split = false;

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
                } else if (get_first_line($(this)).substring(0, 17) == "#sideline-enable") {
                    // todo: behaviour if comment enables some functionality
                    return '<button style="position:absolute" class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
                } else {
                    return '<button style="position:absolute" class="btn btn-default sideline-btn"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
                }
            });
        }

        // todo: remove me
        // remove buttons from outputs
        function remove_buttons() {
            $('#sideline-button').remove();
        }

        /**
         * get first line of code text from input cell
         * 
         * @param {*} thisObj needs to be a $(this) of $('.input')
         */
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

        // pin cell to the sideline-container and apply styles
        function pin_cell(cellObj) {
            $('#sideline-container').append(cellObj)
            cellObj.addClass('sideline-pinned');
            cellObj.find('.sideline-btn').addClass('sideline-active')
            
            set_unpin_listener(cellObj);
        }

        /* button click-listeners */

        // set click()-listeners to pin
        function set_pin_listener() {
            $('.sideline-btn').off('click')
            $('.sideline-btn').click(function () {
                if (is_screen_split == false) split_screen();

                pin_cell($(this).parent().parent());

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

        // execute this code upon loading
        add_buttons();
        set_pin_listener();

        // add resize listener since jupyter will change some styles on resize
        $(window).resize(function () {
            if (is_screen_split) split_screen();
        });

        // pin selected cell to sideline-container
        var handler = function () {
            // if screen is not already split, do that
            if (!is_screen_split) split_screen();
            
            // for all selected cells, pin them to the side
            $('.selected').each(function () {
                pin_cell($(this));
            })
        };

        /* add and register jupyter actions */

        var pin_action = {
            icon: 'fa-thumb-tack', // a font-awesome class used on buttons, etc
            help: 'Pin to Sideline',
            help_index: 'zz',
            handler: handler
        };

        var prefix = 'sideline';
        var action_name = 'pin';
        var full_action_name = Jupyter.actions.register(pin_action, action_name, prefix); // returns 'sideline:pin'
        Jupyter.toolbar.add_buttons_group([full_action_name]);
    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});