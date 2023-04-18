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
	var arr = [];
	var arrResc = [];

	if(width != undefined && width >= minWidth) {
		// is this extension allowed?
		var re = new RegExp("\.(" + allowedExtensions + ")$");
		if(!src.match(re)) return true;

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
			var jsonAnnot;
			var jsonAnnotResc;
			annotations.forEach((annot) => {
				let id = annot[1];
				let x = parseInt(annot[2]);
				let y = parseInt(annot[3]);
				let w = parseInt(annot[4]);
				let h = parseInt(annot[5]);
				let dimx = annot[6];
				let dimy = annot[7];
				let text = annot[8].trim();
				// rescale
				xResc = Math.round(x*width/dimx);
				wResc = Math.round(w*width/dimx);
				yResc = Math.round(y*height/dimy);
				hResc = Math.round(h*height/dimy);
				jsonAnnotResc = {
					'top': yResc,
					'left': xResc,
					'width': wResc,
					'height': hResc,
					'text': text,
					'id': id,
					'editable': true
				}
				jsonAnnot = {
					'top': y,
					'left': x,
					'width': w,
					'height': h,
					'text': text,
					'id': id,
					'editable': true
				}
				arrResc.push(jsonAnnotResc);
				arr.push(jsonAnnot);
			});
			img.annotateImage({
				editable: true,
				useAjax: false,
				notes: arrResc
			});
			
			//console.log(arr);
			//console.log(arrResc);
			// https://doc.wikimedia.org/mediawiki-core/master/js/#!/api/mw.Api

			// Check for changes
			setTimeout(function() {
				arr.forEach((annot) => {
					let id = annot['id'];
					let x = annot['left'];
					let y = annot['top'];
					let w = annot['width'];
					let h = annot['height'];
				});
				
				
				$(".image-annotate-area").each(function() {
					//$(this).addClass( "foo" );
				});
				   
				/*
				odtud koordionáty
				<div class="image-annotate-area image-annotate-area-editable" style="left: 213px; top: 146px;">
					<div style="height: 98.6667px; width: 57.6667px;"></div>
				</div>

				odtud název
				<div class="image-annotate-note" style="display: none; left: 313px; top: 144px;">céva</div>
				*/
			}, 500); // 0.5s

		});
	}
}( mediaWiki, jQuery ) );
