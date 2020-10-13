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
            $('#notebook').css({ 'display': 'flex' })
            $('#notebook-container').css({ 'width': '50vw', 'margin-left': '3vw', 'margin-right': '3vw' });
            //init_side_container()
            is_screen_split = true;
        }

        // reset the layout to the default
        function reset_nb_width() {
            // todo: update once split_screen() uses classes instead of style
            $('#notebook').css({ 'display': '' })
            $('#notebook-container').css({ 'width': '', 'margin-left': '', 'margin-right': '', 'display': '' });
            is_screen_split = false;
        }

        // reset layout if no cells repain pinned
        function check_if_any_pinned() {
            if ($('.sideline-pinned').length == 0) {
                reset_nb_width();
            }
        }

        function popout_view(contents) {
            var myWindow = window.open("", "popup", "width=1000,height=600,scrollbars=yes,resizable=yes," +
                "toolbar=no,directories=no,location=no,menubar=no,status=no,left=0,top=0");
            var doc = myWindow.document;
            doc.open();
            doc.write(contents);
            doc.close();
        }

        function side_to_side_view(contents) {
            $('#notebook-container').after('<div id="side-container">' + contents + '</div>')
            $('#side-container').css({
                'width': '41vw',
                'margin-right': '3vw',
                'padding': '15px',
                'background-color': '#fff',
                'min-height': '0',
                'box-shadow': '0px 0px 12px 1px rgba(87, 87, 87, 0.2)',
                'height': 'fit-content'
            });
        }

        function init_side_container() {
            // remove old output if it exists
            if ($('#side-container').length) $('#side-container').remove();

            // build container element
            $('#notebook-container').after('<div id="side-container" class="rendered_html">'
                + '<div id="scrollable">'
                + '</div></div>')

            // add css to prompt, if it exists
            //if (prompt) $('#side-container').find('.prompt.output_prompt').css({ 'text-align': 'left' });

            // add css to container
            $('#side-container').css({
                'width': '41vw',
                'margin-right': '3vw',
                'padding': '15px',
                'background-color': '#fff',
                'min-height': '0',
                'box-shadow': '0px 0px 12px 1px rgba(87, 87, 87, 0.2)',
                'height': 'fit-content',
                'position': 'fixed',
                'right': '1vw',
            });

            // set the wrapper of the content to be scrollable if content is too long 
            $('#scrollable').css({
                'overflow': 'auto',
                'max-height': '75vh',
            });

            // $('#scrollable').before('<button id="unpin" style="position:absolute; top:1em; right:1em;">x</button>');
            $('#unpin').click(function () {
                $('#side-container').remove();
                reset_nb_width();
                is_screen_split = false;
            })
        }

        function pin_cell(cellObj) {
            cellObj.css({
                'width': '41vw',
                'margin-right': '3vw',
                'padding': '15px',
                'background-color': '#fff',
                'min-height': '0',
                'box-shadow': '0px 0px 12px 1px rgba(87, 87, 87, 0.2)',
                'position': 'absolute',
                'right': '0',
            });
            cellObj.addClass('sideline-pinned');
            cellObj.find('.sideline-btn').addClass('sideline-active')
            cellObj.find('.sideline-btn').off('click')
            cellObj.find('.sideline-btn').click(function () {
                $(this).parent().parent().removeAttr('style'); // maybe use translateX() ?
                $(this).parent().parent().removeClass('sideline-pinned');
                $(this).removeClass('sideline-active')
                check_if_any_pinned();
                set_btn_onclick();
            });
        }

        // set button onClick listeners
        function set_btn_onclick() {
            $('.sideline-btn').off('click')
            $('.sideline-btn').click(function () {

                //var output_prompt = $(this).next('.output').find('.prompt.output_prompt').prop('outerHTML');
                //var exec_order_number = output_prompt.replace(/^\D+|\D+$/g, "");
                //console.log(exec_order_number);

                //popout_view(printContents);
                //side_to_side_view(printContents);

                if (is_screen_split == false) {
                    split_screen();
                }

                pin_cell($(this).parent().parent());

                // todo: hook if result is refreshed to refresh popout
            });
        }

        // execute this code upon loading
        add_buttons();
        set_btn_onclick()




        $(window).resize(function () {
            if (is_screen_split) {
                split_screen();
            }
        });

        // todo: remove me
        //
        //var handler = function () {
        //};
        //var action = {
        //    icon: 'fa-comment-o', // a font-awesome class used on buttons, etc
        //    help: 'Activate Sideline',
        //    help_index: 'zz',
        //    handler: handler
        //};
        //var prefix = 'sideline';
        //var action_name = 'activate';
        //var full_action_name = Jupyter.actions.register(action, action_name, prefix); // returns 'sideline:activate'
        //Jupyter.toolbar.add_buttons_group([full_action_name]);
    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});