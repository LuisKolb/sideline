define([
    'jquery',
    'base/js/namespace',
], function (
    $,
    Jupyter,
) {

    var load_css = function (name) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = requirejs.toUrl(name);
        document.getElementsByTagName("head")[0].appendChild(link);
    };

    // load the extension
    function load_ipython_extension() {

        // todo: css not being uploaded?
        console.log("[sideline] Loading sideline.css");
        load_css('./sideline.css')

        let is_active = false;
        let active_button;

        function toggle_buttons() {
            if (!is_active) {
                let i = 0;
                $('.out_prompt_overlay').after(function () {
                    if ($(this).next('.output').html()) {
                        i += 1;
                        return '<button id="btn-' + i + '" style="position:absolute" class="btn btn-default"><i class="fa fa-thumb-tack" aria-hidden="true"></i></button>';
                    } else {
                        // empty cells, for example, will not have any body, so no button should be inserted
                        return '';
                    }
                });
            } else {
                $('[id^=btn-]').remove();
            }

        }

        function shrink_nb_width() {
            $('#notebook').css({ 'display': 'flex' })
            $('#notebook-container').css({ 'width': '50vw', 'margin-left': '3vw', 'margin-right': '3vw' });
        }

        function reset_nb_width() {
            $('#notebook-container').css({ 'width': '', 'margin-left': '', 'margin-right': '', 'display': '' });
        }

        function toggle_nb_width(is_active_saved) {
            if (!is_active_saved) {
                $('#notebook').css({ 'display': 'flex' })

                $('#notebook-container').css({ 'width': '50vw', 'margin-left': '3vw', 'margin-right': '3vw' });
            }
            else {
                $('#notebook-container').css({ 'width': '', 'margin-left': '', 'margin-right': '', 'display': '' });
            }
        }

        // todo: fix me
        function toggle_button_shadow(id) {
            if (is_active) $(id).css({ 'box-shadow': 'inset 0px 0px 3px 3px rgba(15,160,196,0.75)' });
            else $(id).css({ 'box-shadow': 'none' });
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

        function pint_to_top_view(contents, prompt) {
            // remove old output if it exists
            if ($('#side-container').length) $('#side-container').remove();

            // build container element
            $('#notebook-container').after('<div id="side-container" class="rendered_html">'
                + (prompt ? prompt : '')
                + '<div id="scrollable">'
                + contents
                + '</div></div>')

            // add css to prompt, if it exists
            if (prompt) $('#side-container').find('.prompt.output_prompt').css({ 'text-align': 'left' });

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

            // todo: add button to unpin
            $('#scrollable').before('<button id="unpin" style="position:absolute; top:1em; right:1em;">x</button>');
            $('#unpin').click(function() {
                $('#side-container').remove();
                reset_nb_width();
                is_active = false;
            })
        }

        toggle_buttons();

        $('[id^=btn-]').click(function () {
            // get sibling .output and find .output_subarea
            var printContents = $(this).next('.output').find('.output_subarea').html();
            var output_prompt = $(this).next('.output').find('.prompt.output_prompt').prop('outerHTML');

            //popout_view(printContents);
            //side_to_side_view(printContents);
            pint_to_top_view(printContents, output_prompt);

            if (is_active == false) {
                shrink_nb_width();
                is_active = true;
            }

            // todo: hook if result is refreshed to refresh popout
        });


        $(window).resize(function () {
            if (is_active) {
                shrink_nb_width();
            }
        });

        var handler = function () {

        };

        var action = {
            icon: 'fa-comment-o', // a font-awesome class used on buttons, etc
            help: 'Activate Sideline',
            help_index: 'zz',
            handler: handler
        };
        var prefix = 'sideline';
        var action_name = 'activate';

        var full_action_name = Jupyter.actions.register(action, action_name, prefix); // returns 'sideline:activate'
        Jupyter.toolbar.add_buttons_group([full_action_name]);
    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});