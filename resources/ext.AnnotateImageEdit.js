/**
 * Show annotations in embedded image
 */

( function ( mw, $ ) {

// remove onclick on fullimage
$('.fullImageLink > a ').attr('href', '#');

mw.loader.using(['mediawiki.api'], function() {
	// Backward compatibility: the jQuery plugin stores labels/state on #AnnImCofig.
	if ( $( '#AnnImCofig' ).length === 0 ) {
		$( 'body' ).append( "<div id='AnnImCofig' class='d-none' data-updated=''></div>" );
	}

	var cfg = mw.config.get('wgAnnotateImage') || {};
	var allowedExtensions = cfg.allowedExtensions || $("#AnnImCofig").data("allowedextensions");
	var minWidth = cfg.minWidth || $("#AnnImCofig").data("minwidth");
	var img = $(".fullImageLink > a > img");
	var width = img.attr('width');
	var height = img.attr('height');
	var src = mw.config.get("wgPageName");
	var dimx;
	var dimy;
	var arrResc = [];
	var saveTimer = null;

	if(width != undefined && width >= minWidth) {
		// is this extension allowed?
		var re = new RegExp("\.(" + allowedExtensions + ")$");
		if(!src.match(re)) return true;

		const api = new mw.Api();
		// get image's dimensions (fallback when there are no annotations yet)
		var params = {
			action: 'query',
			prop: 'imageinfo',
			iiprop: 'size',
			titles: src,
			format: 'json'
		};
		var imgInfoReq = api.get(params).done(function (data) {
			const imageInfo = data.query.pages[Object.keys(data.query.pages)[0]];
			if(dimx == undefined) dimx = imageInfo.imageinfo[0].width;
			if(dimy == undefined) dimy = imageInfo.imageinfo[0].height;
		});

		// define button labels for use in jquery plugin
		$("#AnnImCofig").data("btnsave", mw.message("annotateimage-save").text());
		$("#AnnImCofig").data("btncancel", mw.message("annotateimage-cancel").text());
		$("#AnnImCofig").data("btndelete", mw.message("annotateimage-delete").text());
		$("#AnnImCofig").data("btnadd", mw.message("annotateimage-add").text());

		// Add info
		let info = "<div class='d-flex flex-row small lh-sm mt-3 mb-3 AnnImInfo'><img src='https://www.wikiskripta.eu/images/d/d0/Anotace_ikona.svg' alt='annotation' width='35' class='me-2 mt-1' style='pointer-events: none;'>";
		
		
		
		re = new RegExp("#BR#");
		info += "<div class='mt-1'>" + mw.message("annotateimage-info").text().replace(re, "<br>") +"</div>\n";
		info += "<div class='AnnImAdd'></div>\n</div>";
		$(info).insertAfter(img.parent());

		params = {
			action: "parse",
			page: src,
			prop: "wikitext",
			formatversion: "2",
			format: "json"
		};
		
		var parseReq = api.get(params).done(function (data) {
			var imgPageContent = data.parse.wikitext;
			// Find all annotations
			re = /\{\{ImageNote\|id=([0-9]*)\|x=([0-9]*)\|y=([0-9]*)\|w=([0-9]*)\|h=([0-9]*)\|dimx=([0-9]*)\|dimy=([0-9]*)[^\}]*}}([^\{]*)\{\{ImageNoteEnd\|id=[0-9]*[^\}]*}}/g;
			let annotations = [...imgPageContent.matchAll(re)];
			//var jsonAnnot;
			var jsonAnnotResc;
			annotations.forEach((annot) => {
				let id = annot[1];
				let x = parseFloat(annot[2]);
				let y = parseFloat(annot[3]);
				let w = parseFloat(annot[4]);
				let h = parseFloat(annot[5]);
				dimx = parseInt(annot[6]);
				dimy = parseInt(annot[7]);
				let text = annot[8].trim();

				// rescale
				let xResc = Math.round(x*width/dimx);
				let wResc = Math.round(w*width/dimx);
				let yResc = Math.round(y*height/dimy);
				let hResc = Math.round(h*height/dimy);
				jsonAnnotResc = {
					'top': yResc,
					'left': xResc,
					'width': wResc,
					'height': hResc,
					'text': text,
					'id': id,
					'editable': true
				};
				arrResc.push(jsonAnnotResc);
			});
			img.annotateImage({
				editable: true,
				notes: arrResc
			});
		});

		function buildContent() {
			var content = "";
			var i = 1;
			$(".image-annotate-area").each(function() {
				let id = $(this).data("id");
				let text = $(".image-annotate-note[data-id='" + id + "']").text();
				let x = 0;
				let y = 0;
				let w = 0;
				let h = 0;
				re = new RegExp("left: *([\.0-9]*)px; *top: *([\.0-9]*)px");
				let match;
				if ((match = (($(this).attr("style") || "")).match(re))) {
					x = Math.round(parseFloat(match[1]) * dimx / width);
					y = Math.round(parseFloat(match[2]) * dimy / height);
				}
				re = new RegExp("height: *([\.0-9]*)px; *width: *([\.0-9]*)px");
				var innerStyle = $(this).children().first().attr("style") || "";
				if ((match = innerStyle.match(re))) {
					h = Math.round(parseFloat(match[1]) * dimy / height);
					w = Math.round(parseFloat(match[2]) * dimx / width);
				}
				content += "{{ImageNote|id=" + i + "|x=" + x + "|y=" + y + "|w=" + w + "|h=" + h + "|dimx=" + dimx + "|dimy=" + dimy + "}}\n";
				content += text + "\n{{ImageNoteEnd|id=" + i + "}}\n";
				i++;
			});
			return content;
		}

		function saveNow() {
			// Ensure dimensions are known.
			$.when(imgInfoReq, parseReq).always(function() {
				var content = buildContent();
				api.edit(
					src,
					function (revision) {
						re = /\{\{ImageNote\|[^\}]*\}\}[^\{]*\{\{ImageNoteEnd\|[^\}]*\}\}/g;
						$("#AnnImCofig").data("updated", "");
						return {
							text: revision.content.replace(re, "").trimEnd() + "\n\n" + content,
							summary: mw.message("annotateimage-updated").text(),
							minor: true
						};
					}
				);
			});
		}

		mw.hook('ext.annotateImage.updated').add(function() {
			// Debounce to avoid multiple rapid saves.
			clearTimeout(saveTimer);
			saveTimer = setTimeout(saveNow, 400);
		});
	}
});
}( mediaWiki, jQuery ) );
