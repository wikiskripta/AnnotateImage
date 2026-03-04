(function($) {
    var newCounter = 1;

    // Lightweight drag + resize helpers (replaces jquery-ui draggable/resizable)
    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function getCanvasRect($canvas) {
        // Use getBoundingClientRect for consistent coordinates.
        return $canvas[0].getBoundingClientRect();
    }

    function ensureResizeHandles($area) {
        // Keep jquery-ui compatible classnames so existing CSS continues to work.
        var handles = [
            { cls: 'ui-resizable-n' },
            { cls: 'ui-resizable-s' },
            { cls: 'ui-resizable-e' },
            { cls: 'ui-resizable-w' },
            { cls: 'ui-resizable-ne' },
            { cls: 'ui-resizable-nw' },
            { cls: 'ui-resizable-se' },
            { cls: 'ui-resizable-sw' }
        ];
        if ($area.children('.ui-resizable-handle').length) {
            return;
        }
        $area.addClass('ui-resizable');
        handles.forEach(function(h) {
            $area.append('<div class="ui-resizable-handle ' + h.cls + '" data-handle="' + h.cls + '"></div>');
        });
    }

    function makeDraggableResizable($area, $canvas, onUpdate) {
        ensureResizeHandles($area);

        var ns = '.annotate' + Math.random().toString(36).slice(2);

        var state = {
            active: false,
            mode: null, // 'drag' | 'resize'
            handle: null,
            startX: 0,
            startY: 0,
            startLeft: 0,
            startTop: 0,
            startW: 0,
            startH: 0
        };

        function readBox() {
            return {
                left: parseFloat($area.css('left')) || 0,
                top: parseFloat($area.css('top')) || 0,
                width: $area.outerWidth() || 0,
                height: $area.outerHeight() || 0
            };
        }

        function writeBox(left, top, width, height) {
            $area.css({ left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' });
        }

        function onPointerDown(e) {
            // Only primary button.
            if (e.button !== undefined && e.button !== 0) {
                return;
            }
            var $t = $(e.target);
            var isHandle = $t.hasClass('ui-resizable-handle');
            if (isHandle) {
                state.mode = 'resize';
                state.handle = $t.data('handle');
            } else {
                state.mode = 'drag';
                state.handle = null;
            }
            state.active = true;
            state.startX = e.clientX;
            state.startY = e.clientY;
            var box = readBox();
            state.startLeft = box.left;
            state.startTop = box.top;
            state.startW = box.width;
            state.startH = box.height;
            $area[0].setPointerCapture && $area[0].setPointerCapture(e.pointerId);
            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!state.active) {
                return;
            }
            var dx = e.clientX - state.startX;
            var dy = e.clientY - state.startY;
            var canvasRect = getCanvasRect($canvas);
            var minW = 20;
            var minH = 20;

            var left = state.startLeft;
            var top = state.startTop;
            var w = state.startW;
            var h = state.startH;

            if (state.mode === 'drag') {
                left = clamp(state.startLeft + dx, 0, canvasRect.width - w);
                top = clamp(state.startTop + dy, 0, canvasRect.height - h);
            } else {
                var handle = state.handle || '';
                var fromN = handle.indexOf('n') !== -1;
                var fromS = handle.indexOf('s') !== -1;
                var fromE = handle.indexOf('e') !== -1;
                var fromW = handle.indexOf('w') !== -1;

                if (fromE) {
                    w = clamp(state.startW + dx, minW, canvasRect.width - state.startLeft);
                }
                if (fromS) {
                    h = clamp(state.startH + dy, minH, canvasRect.height - state.startTop);
                }
                if (fromW) {
                    var newLeft = clamp(state.startLeft + dx, 0, state.startLeft + state.startW - minW);
                    w = clamp(state.startW - (newLeft - state.startLeft), minW, canvasRect.width);
                    left = newLeft;
                }
                if (fromN) {
                    var newTop = clamp(state.startTop + dy, 0, state.startTop + state.startH - minH);
                    h = clamp(state.startH - (newTop - state.startTop), minH, canvasRect.height);
                    top = newTop;
                }
            }

            writeBox(left, top, w, h);
            if (typeof onUpdate === 'function') {
                onUpdate();
            }
        }

        function onPointerUp() {
            if (!state.active) {
                return;
            }
            state.active = false;
            state.mode = null;
            state.handle = null;
        }

        // Pointer events cover mouse + touch.
        $area.on('pointerdown' + ns, onPointerDown);
        $(window).on('pointermove' + ns, onPointerMove);
        $(window).on('pointerup' + ns + ' pointercancel' + ns, onPointerUp);

        // Store a destroyer on the element.
        $area.data('annotateDestroy', function() {
            $area.off(ns);
            $(window).off(ns);
            $area.removeData('annotateDestroy');
        });
    }
    $.fn.annotateImage = function(options) {
        ///	<summary>
        ///		Creates annotations on the given image.
        ///	</summary>
        var opts = $.extend({}, $.fn.annotateImage.defaults, options);
        var image = this;

        this.image = this;
        this.mode = 'view';

        // Assign defaults
        this.editable = opts.editable;
        this.notes = opts.notes;

        // Add the canvas
        this.canvas = $('<div class="image-annotate-canvas"><div class="image-annotate-view"></div><div class="image-annotate-edit"><div class="image-annotate-edit-area"></div></div></div>');
        this.canvas.children('.image-annotate-edit').hide();
        this.canvas.children('.image-annotate-view').hide();
        this.image.after(this.canvas);

        // Give the canvas and the container their size and background
        this.canvas.height(this.height());
        this.canvas.width(this.width());
        this.canvas.css('background-image', 'url("' + this.attr('src') + '")');
        this.canvas.children('.image-annotate-view, .image-annotate-edit').height(this.height());
        this.canvas.children('.image-annotate-view, .image-annotate-edit').width(this.width());

        // Add the behavior: hide/show the notes when hovering the picture
        this.canvas.hover(function() {
            if ($(this).children('.image-annotate-edit').css('display') == 'none') {
                $(this).children('.image-annotate-view').show();
            }
        }, function() {
            $(this).children('.image-annotate-view').hide();
        });

        this.canvas.children('.image-annotate-view').hover(function() {
            $(this).show();
        }, function() {
            $(this).hide();
        });

        // load the notes
        $.fn.annotateImage.load(this);

        // Add the "Add a note" button
        if (this.editable) {
            this.button = $('<a class="image-annotate-add btn btn-secondary mt-1 me-2 text-white text-decoration-none btn-sm" id="image-annotate-add" href="#">' + $("#AnnImCofig").data("btnadd") + '</a>');
            this.button.click(function() {
                $.fn.annotateImage.add(image);
            });
            //this.canvas.after(this.button);
            $(".AnnImInfo").prepend(this.button);
        }

        // Hide the original
        this.hide();

        return this;
    };

    /**
    * Plugin Defaults
    **/
    $.fn.annotateImage.defaults = {
        editable: true,
        notes: new Array()
    };

    $.fn.annotateImage.clear = function(image) {
        ///	<summary>
        ///		Clears all existing annotations from the image.
        ///	</summary>    
        for (var i = 0; i < image.notes.length; i++) {
            image.notes[image.notes[i]].destroy();
        }
        image.notes = new Array();
    };

    $.fn.annotateImage.load = function(image) {
        ///	<summary>
        ///		Loads the annotations from the notes property passed in on the
        ///     options object.
        ///	</summary>
        for (var i = 0; i < image.notes.length; i++) {
            image.notes[image.notes[i]] = new $.fn.annotateView(image, image.notes[i]);
        }
    };

    $.fn.annotateImage.getTicks = function() {
        ///	<summary>
        ///		Gets a count og the ticks for the current date.
        ///     This is used to ensure that URLs are always unique and not cached by the browser.
        ///	</summary>        
        var now = new Date();
        return now.getTime();
    };

    $.fn.annotateImage.add = function(image) {
        ///	<summary>
        ///		Adds a note to the image.
        ///	</summary>        
        if (image.mode == 'view') {
            image.mode = 'edit';

            // Create/prepare the editable note elements
            var editable = new $.fn.annotateEdit(image);

            $.fn.annotateImage.createSaveButton(editable, image);
            $.fn.annotateImage.createCancelButton(editable, image);
        }
    };

    $.fn.annotateImage.createSaveButton = function(editable, image, note) {
        ///	<summary>
        ///		Creates a Save button on the editable note.
        ///	</summary>
        var ok = $('<a class="image-annotate-edit-ok me-3"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-save me-1" viewBox="0 0 16 16"><path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z"/></svg></i>' + $("#AnnImCofig").data("btnsave") + '</a>');

        ok.click(function() {
            var form = $('#image-annotate-edit-form form');
            var text = $('#image-annotate-text').val();
            $.fn.annotateImage.appendPosition(form, editable)
            image.mode = 'view';

            // Add to canvas
            if (note) {
                note.resetPosition(editable, text);
            } else {
                editable.note.editable = true;
                note = new $.fn.annotateView(image, editable.note)
                note.resetPosition(editable, text);
                image.notes.push(editable.note);
            }
            editable.destroy();
            $("#AnnImCofig").data("updated", "1"); // Backward compatibility
            if (window.mediaWiki && mediaWiki.hook) {
                mediaWiki.hook('ext.annotateImage.updated').fire();
            }
        });
        editable.form.append(ok);
    };

    $.fn.annotateImage.createCancelButton = function(editable, image) {
        ///	<summary>
        ///		Creates a Cancel button on the editable note.
        ///	</summary>
        var cancel = $('<a class="image-annotate-edit-close"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-square me-1" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>' + $("#AnnImCofig").data("btncancel") + '</a>');
        cancel.click(function() {
            editable.destroy();
            image.mode = 'view';
        });
        editable.form.append(cancel);
    };

    $.fn.annotateImage.saveAsHtml = function(image, target) {
        var element = $(target);
        var html = "";
        for (var i = 0; i < image.notes.length; i++) {
            html += $.fn.annotateImage.createHiddenField("text_" + i, image.notes[i].text);
            html += $.fn.annotateImage.createHiddenField("top_" + i, image.notes[i].top);
            html += $.fn.annotateImage.createHiddenField("left_" + i, image.notes[i].left);
            html += $.fn.annotateImage.createHiddenField("height_" + i, image.notes[i].height);
            html += $.fn.annotateImage.createHiddenField("width_" + i, image.notes[i].width);
        }
        element.html(html);
    };

    $.fn.annotateImage.createHiddenField = function(name, value) {
        return '&lt;input type="hidden" name="' + name + '" value="' + value + '" /&gt;<br />';
    };

    $.fn.annotateEdit = function(image, note) {
        ///	<summary>
        ///		Defines an editable annotation area.
        ///	</summary>
        this.image = image;

        if (note) {
            this.note = note;
        } else {
            var newNote = new Object();
            //newNote.id = "new";
            newNote.id = "new" + newCounter;
            newCounter++;
            newNote.top = 30;
            newNote.left = 30;
            newNote.width = 30;
            newNote.height = 30;
            newNote.text = "";
            this.note = newNote;
        }

        // Set area
        var area = image.canvas.children('.image-annotate-edit').children('.image-annotate-edit-area');
        this.area = area;
        this.area.css('height', this.note.height + 'px');
        this.area.css('width', this.note.width + 'px');
        this.area.css('left', this.note.left + 'px');
        this.area.css('top', this.note.top + 'px');

        // Show the edition canvas and hide the view canvas
        image.canvas.children('.image-annotate-view').hide();
        image.canvas.children('.image-annotate-edit').show();

        // Add the note (which we'll load with the form afterwards)
        var form = $('<div id="image-annotate-edit-form"><form><textarea id="image-annotate-text" name="text" rows="3" cols="30">' + this.note.text + '</textarea></form></div>');
        this.form = form;

        $('body').append(this.form);
        this.form.css('left', this.area.offset().left + 'px');
        this.form.css('top', (parseInt(this.area.offset().top) + parseInt(this.area.height()) + 7) + 'px');

        // Lightweight draggable + resizable (no jquery-ui).
        makeDraggableResizable(area, image.canvas, function() {
            form.css('left', area.offset().left + 'px');
            form.css('top', (parseInt(area.offset().top) + parseInt(area.height()) + 2) + 'px');
        });
        return this;
    };

    $.fn.annotateEdit.prototype.destroy = function() {
        ///	<summary>
        ///		Destroys an editable annotation area.
        ///	</summary>        
        this.image.canvas.children('.image-annotate-edit').hide();
        var destroyer = this.area.data('annotateDestroy');
        if (typeof destroyer === 'function') {
            destroyer();
        }
        this.area.children('.ui-resizable-handle').remove();
        this.area.css('height', '');
        this.area.css('width', '');
        this.area.css('left', '');
        this.area.css('top', '');
        this.form.remove();
    }

    $.fn.annotateView = function(image, note) {
        ///	<summary>
        ///		Defines a annotation area.
        ///	</summary>
        this.image = image;
        this.note = note;

        this.editable = (note.editable && image.editable);

        // Add the area
        this.area = $('<div class="image-annotate-area' + (this.editable ? ' image-annotate-area-editable' : '') + '" data-id="' + note.id + '"><div></div></div>');
        image.canvas.children('.image-annotate-view').prepend(this.area);

        // Add the note
        this.form = $('<div class="image-annotate-note" data-id="' + note.id + '">' + note.text + '</div>');
        this.form.hide();
        image.canvas.children('.image-annotate-view').append(this.form);
        this.form.children('span.actions').hide();

        // Set the position and size of the note
        this.setPosition();

        // Add the behavior: hide/display the note when hovering the area
        var annotation = this;
        this.area.hover(function() {
            annotation.show();
        }, function() {
            setTimeout(() => {
                annotation.hide();
            }, "1500");
            //annotation.hide();
        });

        // Edit a note feature
        if (this.editable) {
            var form = this;
            this.area.click(function() {
                form.edit();
                return false;
            });
        }
    };

    $.fn.annotateView.prototype.setPosition = function() {
        ///	<summary>
        ///		Sets the position of an annotation.
        ///	</summary>
        this.area.children('div').height((parseInt(this.note.height) - 2) + 'px');
        this.area.children('div').width((parseInt(this.note.width) - 2) + 'px');
        this.area.css('left', (this.note.left) + 'px');
        this.area.css('top', (this.note.top) + 'px');
        this.form.css('left', (this.note.left) + 'px');
        this.form.css('top', (parseInt(this.note.top) + parseInt(this.note.height) + 5) + 'px');
    };

    $.fn.annotateView.prototype.show = function() {
        ///	<summary>
        ///		Highlights the annotation
        ///	</summary>
        this.form.fadeIn(250);
        if (!this.editable) {
            this.area.addClass('image-annotate-area-hover');
        } else {
            this.area.addClass('image-annotate-area-editable-hover');
        }
    };

    $.fn.annotateView.prototype.hide = function() {
        ///	<summary>
        ///		Removes the highlight from the annotation.
        ///	</summary>      
        this.form.fadeOut(250);
        this.area.removeClass('image-annotate-area-hover');
        this.area.removeClass('image-annotate-area-editable-hover');
    };

    $.fn.annotateView.prototype.destroy = function() {
        ///	<summary>
        ///		Destroys the annotation.
        ///	</summary>      
        this.area.remove();
        this.form.remove();
    }

    $.fn.annotateView.prototype.edit = function() {
        ///	<summary>
        ///		Edits the annotation.
        ///	</summary>      
        if (this.image.mode == 'view') {
            this.image.mode = 'edit';
            var annotation = this;

            // Create/prepare the editable note elements
            var editable = new $.fn.annotateEdit(this.image, this.note);

            $.fn.annotateImage.createSaveButton(editable, this.image, annotation);

            // Add the delete button
            var del = $('<a class="image-annotate-edit-delete me-3"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash me-1" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/></svg>' + $("#AnnImCofig").data("btndelete") + '</a>');
            del.click(function() {
                var form = $('#image-annotate-edit-form form');

                $.fn.annotateImage.appendPosition(form, editable)

                annotation.image.mode = 'view';
                editable.destroy();
                annotation.destroy();
                $("#AnnImCofig").data("updated", "1"); // Backward compatibility
                if (window.mediaWiki && mediaWiki.hook) {
                    mediaWiki.hook('ext.annotateImage.updated').fire();
                }
            });
            editable.form.append(del);

            $.fn.annotateImage.createCancelButton(editable, this.image);
        }
    };

    $.fn.annotateImage.appendPosition = function(form, editable) {
        ///	<summary>
        ///		Appends the annotations coordinates to the given form that is posted to the server.
        ///	</summary>
        var areaFields = $('<input type="hidden" value="' + editable.area.height() + '" name="height"/>' +
                           '<input type="hidden" value="' + editable.area.width() + '" name="width"/>' +
                           '<input type="hidden" value="' + editable.area.position().top + '" name="top"/>' +
                           '<input type="hidden" value="' + editable.area.position().left + '" name="left"/>' +
                           '<input type="hidden" value="' + editable.note.id + '" name="id"/>');
        form.append(areaFields);
    }

    $.fn.annotateView.prototype.resetPosition = function(editable, text) {
        ///	<summary>
        ///		Sets the position of an annotation.
        ///	</summary>
        this.form.html(text);
        this.form.hide();

        // Resize
        this.area.children('div').height(editable.area.height() + 'px');
        this.area.children('div').width((editable.area.width() - 2) + 'px');
        this.area.css('left', (editable.area.position().left) + 'px');
        this.area.css('top', (editable.area.position().top) + 'px');
        this.form.css('left', (editable.area.position().left) + 'px');
        this.form.css('top', (parseInt(editable.area.position().top) + parseInt(editable.area.height()) + 7) + 'px');

        // Save new position to note
        this.note.top = editable.area.position().top;
        this.note.left = editable.area.position().left;
        this.note.height = editable.area.height();
        this.note.width = editable.area.width();
        this.note.text = text;
        this.note.id = editable.note.id;
        this.editable = true;
    };

})(jQuery);