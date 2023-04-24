/**
 * Show annotations in embedded image
 */

( function ( mw, $ ) {

	var allowedExtensions = $("#AnnImCofig").data("allowedextensions");
	var minWidth = $("#AnnImCofig").data("minwidth");
	var img = $(".fullImageLink > a > img");
	var width = img.attr('width');
	var height = img.attr('height');
	var src = mw.config.get("wgPageName");
	var dimx;
	var dimy;
	var arrResc = [];

	if(width != undefined && width >= minWidth) {
		// is this extension allowed?
		var re = new RegExp("\.(" + allowedExtensions + ")$");
		if(!src.match(re)) return true;

		// define button labels for use in jquery plugin
		$("#AnnImCofig").data("btnsave", mw.message("annotateimage-save").text());
		$("#AnnImCofig").data("btncancel", mw.message("annotateimage-cancel").text());
		$("#AnnImCofig").data("btndelete", mw.message("annotateimage-delete").text());
		$("#AnnImCofig").data("btnadd", mw.message("annotateimage-add").text());

		// Add info
		let info = "<div class='d-flex flex-row small lh-sm mt-3 mb-3 AnnImInfo'><img src='https://www.wikiskripta.eu/thumb.php?f=Anotace_ikona.svg&width=35' alt='annotation' width='35' class='me-2 mt-1'>";
		re = new RegExp("#BR#");
		info += "<div class='mt-1'>" + mw.message("annotateimage-info").text().replace(re, "<br>") +"</div>\n";
		info += "<div class='AnnImAdd'></div>\n</div>";
		$(info).insertAfter(img.parent());	

		const params = {
			action: "parse",
			page: src,
			prop: "wikitext",
			formatversion: "2",
			format: "json"
		};
		const api = new mw.Api();
		
		api.get(params).done(function (data) {
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
				// replace [[nazev_clanku_na_WS|text_odkazu]] na html odkaz
				/*
				re = /\[\[ *([^\]]*?) *\| *(.*?) *\]\]/ig;
				text = text.replaceAll(re, '<a href="' + location.origin + '/w/$1">$2</a>');
				re = /\[\[ *([^\]]*?) *\]\]/ig;
				text = text.replaceAll(re, '<a href="' + location.origin + '/w/$1">$1</a>');
				re = /''' *(.*?)'''/ig;
				text = text.replaceAll(re, '<strong>$1</strong>');
				re = /'' *(.*?)''/ig;
				text = text.replaceAll(re, '<em>$1</em>');
				re = /<sup> *(.*?)<\/sup>/ig;
				text = text.replaceAll(re, '<sup>$1</sup>');
				re = /<sub> *(.*?)<\/sub>/ig;
				text = text.replaceAll(re, '<sub>$1</sub>');
				re = /(\r|\n)/ig;
				text = text.replaceAll(re, '<br>');
				*/
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
				useAjax: false,
				notes: arrResc
			});

			// Check for changes
			setInterval(function() {
				if($("#AnnImCofig").data("updated")) {
					// Annots data have been updated - save them
					var content = "";
					var i = 1;
					$(".image-annotate-area").each(function() {
						let id = $(this).data("id");
						let text = $(".image-annotate-note[data-id=" + id + "]").text();
						let x = 0;
						let y = 0;
						let w = 0;
						let h = 0;
						re = new RegExp("left: *([\.0-9]*)px; *top: *([\.0-9]*)px");
						if(match = $(this).attr("style").match(re)) {
							x = parseFloat(match[1]);
							x = Math.round(x*dimx/width);
							y = parseFloat(match[2]);
							y = Math.round(y*dimy/height);
						}
						re = new RegExp("height: *([\.0-9]*)px; *width: *([\.0-9]*)px");
						if(match = $(this).children().first().attr("style").match(re)) {
							h = parseFloat(match[1]);
							h = Math.round(h*dimy/height);
							w = parseFloat(match[2]);
							w = Math.round(w*dimx/width);
						}
						content += "{{ImageNote|id=" + i + "|x=" + x + "|y=" + y + "|w=" + w + "|h=" + h + "|dimx=" + dimx + "|dimy=" + dimy + "}}\n";
						content += text + "\n{{ImageNoteEnd|id=" + i + "}}\n";
						i++;
					});

					// save to file article (// https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.Api)
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
					)
					.then( function () {
						//console.log( 'Saved!' );
					});
				}
			}, 1000); // 0.5s

		});
	}
}( mediaWiki, jQuery ) );
