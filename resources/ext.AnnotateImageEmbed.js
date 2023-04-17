/**
 * Show annotations in embedded image
 */

( function ( mw, $ ) {

	var allowedExtensions = $("#AnnImCofig").data("allowedextensions");
	var minWidth = $("#AnnImCofig").data("minwidth");
	var pageAPI = location.origin + "/api.php";

	$('img').each(function(){
		var width = $(this).attr('width');
		var height = $(this).attr('height');
		if(width != undefined && width >= minWidth) {
			// get filename
			var src = $(this).attr('src');
			var img = $(this);
			var re = new RegExp("/sites/[^/]*");
			src = src.replace(re, '');
			if(!src.includes("/thumb/")) re = new RegExp(".*/([^/]*)$");
			else re = new RegExp(".*/([^/]*)/[^/]*$");
			var match = src.match(re);
			src = match[1];

			// is this extension allowed?
			re = new RegExp("\.(" + allowedExtensions + ")$");
			if(!src.match(re)) return true;

			// get info about picture (api.php?action=parse&page=Soubor:Cystadenoma_mucinosum_ovarii_(55A).jpg&prop=wikitext&formatversion=2)
			$.getJSON( pageAPI, {
				action: "parse",
				page: "File:" + decodeURI(src),
				prop: "wikitext",
				formatversion: "2",
				format: "json"
			})
			.done(function( data ) {
				var imgPageContent = data.parse.wikitext;
				//console.log(imgPageContent);
				// Find all annotations
				re = /\{\{ImageNote\|id=([0-9]*)\|x=([0-9]*)\|y=([0-9]*)\|w=([0-9]*)\|h=([0-9]*)\|dimx=([0-9]*)\|dimy=([0-9]*)[^\}]*}}([^\{]*)\{\{ImageNoteEnd\|id=[0-9]*[^\}]*}}/g;
				let annotations = [...imgPageContent.matchAll(re)];
				var arr = [];
				var jsonAnnot;
				annotations.forEach((annot) => {
					let id = annot[1];
					let x = annot[2];
					let y = annot[3];
					let w = annot[4];
					let h = annot[5];
					let dimx = annot[6];
					let dimy = annot[7];
					let text = annot[8].trim();
					// rescale
					x = Math.round(x*width/dimx);
					w = Math.round(w*width/dimx);
					y = Math.round(y*height/dimy);
					h = Math.round(h*height/dimy);
					jsonAnnot = {
						'top': y,
						'left': x,
						'width': w,
						'height': h,
						'text': text,
						'id': id,
						'editable': false
					}
					arr.push(jsonAnnot);
				});
				//console.log(arr);
				img.annotateImage({
					editable: false,
					useAjax: false,
					notes: arr
				});
			});
		}
	});
}( mediaWiki, jQuery ) );
