define(["jquery", "base/js/namespace", "require"], function ($, Jupyter, requirejs) {
    // initial state
    var is_screen_split = false;
    var highest_pindex = 1;

    // function to load css from a file name in the same directory
    var load_css = function (arg) {
        var link = $("<link/>");
        $("head").append(link);
        link.attr("href", requirejs.toUrl("./" + arg + ".css"))
            .attr("rel", "stylesheet")
            .attr("type", "text/css");
    };

    /* user behaviour logging for analysis */

    var postingNotebook = false;
    var notebookName = $("#notebookName").text();
    var userHash = window.location.pathname.split("-").pop().split("/")[0];
    var gcpUrl = "https://us-central1-sideline-302116.cloudfunctions.net/"; // vm url harcoded
    if (window.location.hostname === "localhost") {
        // use firebase emulator if running on localhost
        gcpUrl = "http://127.0.0.1:5001/sideline-302116/us-central1/";
        console.log("[sideline] Using local firebase emulator for development.");
    }

    var log_action = function (userAction) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", gcpUrl + "addLogLine", true);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onerror = function () {
            console.log("Error logging activity '" + userAction + "'.");
        };
        xhr.send(userHash + "," + decodeURIComponent(notebookName) + "," + userAction);
    };

    var nb_json_to_firestore = function () {
        postingNotebook = true;
        $.ajax({
            type: "POST",
            url: gcpUrl + "addNotebookJSON",
            contentType: "text/plain",
            data: userHash + "," + decodeURIComponent(notebookName) + "," + JSON.stringify(Jupyter.notebook.toJSON()),
        })
            .done(() => {
                postingNotebook = false;
                alert("Upload successful!");
            })
            .fail(function (xhr, textStatus, errorThrown) {
                postingNotebook = false;
                alert("Notebook upload failed:\n" + xhr.status + ": " + xhr.statusText);
            });
    };

    /* functions copied from tags.js in the Jupyter Notebook Github repository */

    var make_tag = function (name, on_remove, is_editable) {
        var tag_UI = $("<span/>").addClass("cell-tag").text(name);

        if (is_editable) {
            var remove_button = $("<i/>")
                .addClass("remove-tag-btn")
                .addClass("fa fa-times")
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
        cell.events.trigger("set_dirty.Notebook", { value: true });
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
        if (name === "") {
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
            jQuery.data(tag_container, "tag_map", tag_map);
        }
    };

    /* overwrite cell pasting functions */

    /**
     * Replace the selected cell with the cells in the clipboard.
     */
    require("notebook/js/notebook").Notebook.prototype.paste_cell_replace = function () {
        if (!(this.clipboard !== null && this.paste_enabled)) {
            return;
        }

        var selected = this.get_selected_cells_indices();
        var insertion_index = selected[0];
        this.delete_cells(selected);

        for (var i = this.clipboard.length - 1; i >= 0; i--) {
            var cell_data = this.clipboard[i];
            var new_cell = this.insert_cell_at_index(cell_data.cell_type, insertion_index);
            new_cell.fromJSON(cell_data);

            // sideline custom logic for metadata & classes
            sideline_after_insert(new_cell);
        }

        this.select(insertion_index + this.clipboard.length - 1);
    };

    /**
     * Paste cells from the clipboard above the selected cell.
     */
    require("notebook/js/notebook").Notebook.prototype.paste_cell_above = function () {
        if (this.clipboard !== null && this.paste_enabled) {
            var first_inserted = null;
            for (var i = 0; i < this.clipboard.length; i++) {
                var cell_data = this.clipboard[i];
                var new_cell = this.insert_cell_above(cell_data.cell_type);
                new_cell.fromJSON(cell_data);

                // sideline custom logic for metadata & classes
                sideline_after_insert(new_cell);

                if (first_inserted === null) {
                    first_inserted = new_cell;
                }
            }
            first_inserted.focus_cell();
        }
    };

    /**
     * Paste cells from the clipboard below the selected cell.
     */
    require("notebook/js/notebook").Notebook.prototype.paste_cell_below = function () {
        if (this.clipboard !== null && this.paste_enabled) {
            var first_inserted = null;
            for (var i = this.clipboard.length - 1; i >= 0; i--) {
                var cell_data = this.clipboard[i];
                var new_cell = this.insert_cell_below(cell_data.cell_type);
                new_cell.fromJSON(cell_data);

                // sideline custom logic for metadata & classes
                sideline_after_insert(new_cell);

                if (first_inserted === null) {
                    first_inserted = new_cell;
                }
            }
            first_inserted.focus_cell();
        }
    };

    /* overwrite insert_element_at_index() */

    /**
     * Insert an element at given cell index.
     *
     * @param {HTMLElement} element - a cell element
     * @param {integer}     [index] - a valid index where to inser cell
     * @returns {boolean}   success
     */
    require("notebook/js/notebook").Notebook.prototype._insert_element_at_index = function (element, index) {
        if (element === undefined) {
            return false;
        }

        var ncells = this.ncells();

        if (ncells === 0) {
            // special case append if empty
            this.container.append(element);
        } else if (ncells === index) {
            // special case append it the end, but not empty
            this.get_cell_element(index - 1).after(element);
        } else if (this.is_valid_cell_index(index)) {
            // otherwise always somewhere to append to
            this.get_cell_element(index).before(element);
        } else {
            return false;
        }

        this.undelete_backup_stack.map(function (undelete_backup) {
            if (index < undelete_backup.index) {
                undelete_backup.index += 1;
            }
        });

        // sideline custom logic for metadata
        sideline_after_insert(Jupyter.notebook.get_cell(index));

        this.set_dirty(true);
        return true;
    };

    /* overwrite text cell execution functions */
    var subplots_already_executed = [];

    require("notebook/js/textcell").MarkdownCell.prototype.execute = function () {
        // custom logic: if link-cell -> find all subplot indices and execute them first
        let line = this.code_mirror.getLine(0);
        if (line.startsWith("sideline - link to subplot ")) {
            var name = line.split("sideline - link to subplot ")[1];
            var subplots_to_execute = [];

            console.log("[sideline] Executing subplot " + name + " from referencing cell.");

            for (var i = 0; i < Jupyter.notebook.ncells(); i++) {
                if (get_sideline_tag(Jupyter.notebook.get_cell(i)) == name) {
                    subplots_to_execute.push(i);
                }
            }

            for (index of subplots_to_execute) {
                Jupyter.notebook.get_cell(index).execute();
                subplots_already_executed.push(index);
            }
        }

        this.render();
    };

    /* overwrite execute_cells */

    /**
     * Execute cells corresponding to the given indices.
     *
     * @param {Array} indices - indices of the cells to execute
     */
    require("notebook/js/notebook").Notebook.prototype.execute_cells = function (indices) {
        if (indices.length === 0) {
            return;
        }

        var cell;
        subplots_already_executed = [];
        for (var i = 0; i < indices.length; i++) {
            cell = this.get_cell(indices[i]);
            if (!subplots_already_executed.includes(i)) {
                cell.execute();
            }
        }
        subplots_already_executed = [];

        this.select(indices[indices.length - 1]);
        this.command_mode();
        this.set_dirty(true);
    };

    /* custom tag functions */

    // return the first found sideline tag (only the tag string)
    var get_sideline_tag = function (cell) {
        if (cell && cell.metadata && cell.metadata.tags) {
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
                let name = get_sideline_tag(Jupyter.notebook.get_cell(cell));

                // check if the subplot name is a higher int and increase the tracker
                if (Number.isInteger(parseFloat(name)) && parseInt(name) >= highest_pindex) {
                    highest_pindex = parseFloat(name) + 1;
                }

                // remember cells and pin later, since pinning here would skip every second cell because indices change
                cells_to_pin.push([Jupyter.notebook.get_cell_element(cell), name]);
            } else if (line.startsWith("sideline - link to subplot ")) {
                let name = line.split("sideline - link to subplot ")[1];
                add_container_with_buttons(Jupyter.notebook.get_cell_element(cell), name);
            }
        }

        var pin_tagged_cell = function (cellObj, name) {
            if (!is_screen_split) {
                split_screen();
            }

            // check if cell with id already exists, and pin below it to keep subplots together
            if ($(".subplot-" + name).length > 0) {
                $(".subplot-" + name)
                    .last()
                    .after(cellObj);
            } else {
                $("#sideline-container").append("<div id='subplot-header-" + name + "' class='subplot-" + name + " sl-header'><div class='sl-divider'></div></div>");
                $("#sideline-container").append(cellObj);
            }

            cellObj.addClass("sideline-pinned");
            cellObj.addClass("subplot-" + name);
        };

        // pin the remembered cells
        for (let i = 0; i < cells_to_pin.length; i++) {
            pin_tagged_cell(cells_to_pin[i][0], cells_to_pin[i][1]);
        }
    };

    // pin a new cell to the sideline-container and apply styles
    var pin_new_cell = function (cell) {
        //prevent only already "linking" md-cells from being pinned, don't prevent other md-cells from being pinned
        if (cell.cell_type != "markdown" || !cell.code_mirror.getLine(0).includes("sideline")) {
            let cellObj = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));
            if (!cellObj.hasClass("sideline-pinned")) {
                log_action("create new subplot: " + highest_pindex);

                // insert a markdown-cell above the selected cell, and set its value
                var md_reference_cell = Jupyter.notebook.insert_cell_above("markdown");
                md_reference_cell.unrender();
                md_reference_cell.code_mirror.setValue("sideline - link to subplot " + highest_pindex);
                md_reference_cell.render();

                // add button container next to the md-cell
                add_container_with_buttons(Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(md_reference_cell)), highest_pindex);

                // add sideline markers/metadata
                var tag_container = cellObj.find(".tag-container");
                var name = "subplot-" + highest_pindex;
                add_tag(cell, name, tag_container, remove_tag(cell, tag_container));

                cellObj.addClass("sideline-pinned");
                cellObj.addClass("subplot-" + highest_pindex);
                $("#sideline-container").append(cellObj);

                // add header cell
                cellObj.before("<div id='subplot-header-" + highest_pindex + "' class='subplot-" + highest_pindex + " sl-header'><div class='sl-divider'></div></div>");

                // scroll to the cell that was just pinned
                document.getElementsByClassName("subplot-" + highest_pindex)[0].scrollIntoView();

                highest_pindex++;
            }
        }
    };

    // add a button container and set onclicks
    var add_container_with_buttons = function (ref, name) {
        ref.prepend('<div class="sideline-btn-container">' + '<button id="sideline-toggle-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-toggle-on" aria-hidden="true"></i><i class="fa fa-toggle-off" aria-hidden="true" style="display: none;"></i></button>' + '<button id="sideline-goto-' + name + '" class="btn btn-default sideline-btn"><i class="fa fa-arrow-circle-right" aria-hidden="true"></i></button>' + "</div>");
        ref.find("#sideline-goto-" + name).click(function () {
            let targets = document.getElementsByClassName("subplot-" + name);
            if (!is_screen_split) {
                split_screen();
            }
            // if subplots are hidden, show them before proceeding
            for (target of targets) {
                if (target.style.display == "none") {
                    target.removeAttribute("style"); // entirely remove style attribute when toggled visible
                    $(this).parent().find("i.fa-toggle-on").show();
                    $(this).parent().find("i.fa-toggle-off").hide();
                }
            }
            targets[0].scrollIntoView();
            // blinking animation
            var count = 0;
            var x = setInterval(function () {
                $(".subplot-" + name).toggleClass("background-hint");
                if (count >= 3) clearInterval(x);
                count++;
            }, 500);
            log_action("scroll to subplot: " + name);
        });
        ref.find("#sideline-toggle-" + name).click(function () {
            if (!is_screen_split) {
                split_screen();
            }
            let targets = document.getElementsByClassName("subplot-" + name);
            for (target of targets) {
                if (target.style.display == "none") {
                    target.removeAttribute("style"); // entirely remove style attribute when toggled visible
                    $(this).find("i.fa-toggle-on").show();
                    $(this).find("i.fa-toggle-off").hide();
                } else {
                    target.style.display = "none";
                    $(this).find("i.fa-toggle-on").hide();
                    $(this).find("i.fa-toggle-off").show();
                }
            }
            // if no cells are shown, reset screen to default view
            if ($(".sideline-pinned:visible").length == 0) {
                reset_screen();
            }
            log_action("toggle subplot: " + name);
        });
    };

    // split the screen to make space for pinned elements on the side
    var split_screen = function () {
        $("#notebook").css({ display: "flex" });
        $("#notebook-container").addClass("nb-container");
        if (!$("#sideline-container").length) {
            insert_sideline_container();
        }
        // show the container
        $("#sideline-container").show();
        // jupyter action button icon to "fa-eye"
        $('div.btn-group button[data-jupyter-action="sideline:hide_container"] i.fa').removeClass("fa-eye-slash").addClass("fa-eye");
        is_screen_split = true;
    };

    // reset the layout to the default
    var reset_screen = function () {
        $("#notebook").css({ display: "" });
        $("#notebook-container").removeClass("nb-container");
        // hide the container
        $("#sideline-container").hide();
        // jupyter action button icon to "fa-eye-slash"
        $('div.btn-group button[data-jupyter-action="sideline:hide_container"] i.fa').removeClass("fa-eye").addClass("fa-eye-slash");
        is_screen_split = false;
    };

    // get height of the header to align items below
    var get_header_height = function () {
        return $("#header").height() + "px";
    };

    /* sideline-container functions */

    var insert_sideline_container = function () {
        $("#notebook-container").append('<div id="sideline-container" class="sl-container"></div>');
        $("#sideline-container").css({
            top: get_header_height(),
        });
    };

    var hide_all_subplots = function () {
        if (is_screen_split) {
            reset_screen();
        }
        // hide all subplots, buttons to off
        $("[class*='subplot']").hide();
        $("button").find("i.fa-toggle-on").hide();
        $("button").find("i.fa-toggle-off").show();
    };

    var show_all_subplots = function () {
        if (!is_screen_split) {
            split_screen();
        }
        // show all subplots, buttons to on
        $("[class*='subplot']").show()
        $("button").find("i.fa-toggle-on").show();
        $("button").find("i.fa-toggle-off").hide();
    };

    var observer;
    var current = ""; // last selected subplot name
    var mostRecentCell;

    // setup listeners
    var setup = function () {
        // reset global vars
        is_screen_split = false;
        highest_pindex = 1;

        // save the tags of the most recently selected subplot
        // need to listen to all nodes to register a cell coming into the container while already being selected
        //      -> cannot limit to #sideline-container
        var target = document.querySelector("#notebook");
        var config = { attributes: true, childList: true, characterData: false, subtree: true, attributeFilter: ["class"] };
        var selection_callback = function (mutations) {
            mutations.forEach(function (mutation) {
                switch (mutation.type) {
                    case "attributes":
                        if (mutation.target.classList.contains("selected")) {
                            for (let i = 0; i < mutation.target.classList.length; i++) {
                                if (mutation.target.classList[i].startsWith("subplot-")) {
                                    current = mutation.target.classList[i];
                                }
                            }
                            mostRecentCell = Jupyter.notebook.get_selected_cell();
                        }
                        break;
                }
            });
        };

        if (observer) {
            //disconnect observer in case of refresh action
            observer.disconnect();
        }

        observer = new MutationObserver(selection_callback); // instanciate the mutationObserver
        if (target) observer.observe(target, config); // start the observer

        // add a resize listener since jupyter will change some styles on resize
        $(window).resize(function () {
            if (is_screen_split) split_screen();
        });

        // add a listener when user navigtes to next task/clicks our specific link
        $(".sideline-link-to-next").bind("click", () => {
            log_action("user openend the link to " + $(".sideline-link-to-next").text());
        });

        window.onbeforeunload = function (e) {
            log_action("user left the page");
            if (postingNotebook) return "Notebook uploading, please wait...";
            return; // return undefined to prevent confirmation dialog
        };

        pin_tagged_cells();
    };

    // manage metadata and classes for new cells inserted into the sideline-container
    var sideline_after_insert = function (cell) {
        var cell_elem = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));

        // only add metadata if the element is inside the container
        if (cell_elem.parent("#sideline-container").length > 0) {
            if (get_sideline_tag(mostRecentCell)) {
                // only add metadata if the most recent selected cell was a subplot
                var tag_container = cell_elem.find(".tag-container");
                add_tag(cell, current, tag_container, remove_tag(cell, tag_container));
                cell_elem.addClass("sideline-pinned");
                cell_elem.addClass(current);

                // in the case of insert_cell_below the new cell will be inserted at get_cell(index).before(newCell) ->
                // would be inserted before the next subplot, which is AFTER the next subplot's header ->
                // we have to swap the header and the new cell_elem
                if (!cell_elem.prev().hasClass(current)) {
                    var siblingHeader = cell_elem.prev();
                    cell_elem.after(siblingHeader);
                }
            } else {
                // if most recent cell is not a subplot, but the parent after insertion is the subplot container ->
                // we hit the edge case of insertion at the bottom of the main narrative, so move the cell accordingly
                $("#sideline-container").before(cell_elem);
            }
        }
    };

    /* jupyter action handlers */

    // pin selected cell to sideline-container
    var pin_handler = function () {
        // if screen is not already split, do that
        if (!is_screen_split) {
            split_screen();
        }

        // for all selected cells, pin them to the side
        pin_new_cell(Jupyter.notebook.get_selected_cell());
    };

    // unpin selected cell, remove markers and tags as well as referencing "link"-cells
    var unpin_handler = function () {
        var cell = Jupyter.notebook.get_selected_cell();
        var jq_cell = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(cell));

        // only unpin if the selected element is inside the sl-container
        if (jq_cell.parent("#sideline-container").length > 0) {
            var name = get_sideline_tag(cell);
            var whole_tag = "subplot-" + name;

            log_action("unpin subplot: " + name);

            // iterate through all cells to get references to the cell elements
            var cells = [];
            var i = 0;
            while (i <= Jupyter.notebook.ncells()) {
                if (get_sideline_tag(Jupyter.notebook.get_cell(i)) == name) {
                    cells.push(Jupyter.notebook.get_cell(i));
                }
                i++;
            }

            // the first found/valid linking cells
            var ref_link = $("#sideline-toggle-" + name)
                .first()
                .parent()
                .parent();

            cells.forEach((elem) => {
                jq_ref = Jupyter.notebook.get_cell_element(Jupyter.notebook.find_cell_index(elem));

                if (ref_link.length > 0) {
                    ref_link.before(jq_ref);
                } else {
                    // if no link is found, append at end of nb
                    $("#sideline-container").before(jq_ref);
                }

                // remove sideline markers and metadata
                jq_ref.removeClass("sideline-pinned");
                jq_ref.removeClass(whole_tag);
                write_tag(elem, whole_tag, false);
            });

            // manually remove the tag in case cellToolbar is open
            if ($('.cell-tag:contains("' + whole_tag + '")').length > 0) {
                $('.cell-tag:contains("' + whole_tag + '")').remove();
            }

            $(".sl-header.subplot-" + name).remove();
            ref_link.remove();

            // reset layout to default view if no more cells are pinned
            if ($(".sideline-pinned").length == 0) {
                reset_screen();
            }
        }
    };

    // toggle visibility of sideline and toggle layout
    var hide_container_handler = function () {
        if ($("#sideline-container").css("display") == "none") {
            show_all_subplots();
            log_action("show all cells");
        } else {
            hide_all_subplots();
            log_action("hide all cells");
        }
    };

    var reload_handler = function () {
        log_action("reload");
        setup();
    };

    var upload = function () {
        log_action("upload");
        nb_json_to_firestore();
    };

    // load the extension
    var initialize = function () {
        console.log("[sideline] Loading sideline.css");
        load_css("sideline");
        console.log("[sideline] This version is made specifically for Binder to log participant's interactions with the extension.");
        setup();
        log_action("user started the session");

        var pin_action = {
            icon: "fa-thumb-tack",
            help: "Create Subplot with the selected Cell",
            help_index: "zz",
            handler: pin_handler,
        };

        var unpin_action = {
            icon: "fa-ban",
            help: "Unpin selected Subplot",
            help_index: "zz",
            handler: unpin_handler,
        };

        var hide_container_action = {
            icon: "fa-eye",
            help: "Hide Sideline",
            help_index: "zz",
            handler: hide_container_handler,
        };

        var reload_action = {
            icon: "fa-retweet",
            help: "Reload Sideline",
            help_index: "zz",
            handler: reload_handler,
        };

        var upload_action = {
            icon: "fa-upload",
            help: "Hand in the Notebook",
            help_index: "zz",
            handler: upload,
        };

        var prefix = "sideline";
        var pin_action_name = Jupyter.actions.register(pin_action, "pin", prefix);
        var unpin_action_name = Jupyter.actions.register(unpin_action, "unpin", prefix);
        var hide_container_action_name = Jupyter.actions.register(hide_container_action, "hide_container", prefix);
        var reload_action_name = Jupyter.actions.register(reload_action, "reload", prefix);
        var upload_action_name = Jupyter.actions.register(upload_action, "upload", prefix);
        Jupyter.toolbar.add_buttons_group([pin_action_name, unpin_action_name, hide_container_action_name, reload_action_name, upload_action_name]);
    };

    var load_ipython_extension = function () {
        Jupyter.notebook.events.on("notebook_loaded.Notebook", initialize());
    };

    return {
        load_ipython_extension: load_ipython_extension,
    };
});
