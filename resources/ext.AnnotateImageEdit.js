/**
 * Show annotations in embedded image
 */

( function ( mw, $ ) {

	var allowedExtensions = $("#AnnImCofig").data("allowedextensions");
	var minWidth = $("#AnnImCofig").data("minwidth");
	var pageAPI = location.origin + "/api.php";

	let img = $(".fullImageLink > a > img");
	var width = img.attr('width');
	var height = img.attr('height');
	console.log(width);
	console.log(height);
	console.log(mw.config.get("wgPageName"));
	return true;

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

	/*
	var conf = mw.config.values;
	var pageAPI = location.origin + "/api.php?action=query";
	var api;

    // handle newthread form
    $('#newThreadForm').submit(function( event ) {
		event.preventDefault();

		var shownTS = $(this).parent().data("shownTS"); // timestamp of showing the form
		var newThreadTextElement = $(this).find("#newThreadText");
		var newThreadText = newThreadTextElement.val();
		newThreadText = newThreadText.replace(/^:/m, "");
		newThreadText = newThreadText.replace(/\r?\n/g, " ");
		if(newThreadText.search(/~~~~/) == -1) newThreadText += " -- ~~~~";	
		var newThreadName = $(this).find("#newThreadName").val();

		// get timestamp of last revision
		// api.php?action=query&prop=revisions&titles=Diskuse:Hlavní_strana&rvslots=*&rvprop=content|timestamp&formatversion=2&format=json"
		$.getJSON( pageAPI, {
    		prop: "revisions",
			titles: mw.config.get("wgPageName"),
			rvslots: "*",
			rvprop: "content|timestamp",
			formatversion: "2",
    		format: "json"
		})
    	.done(function( data ) {
			var lastRevTimestamp = data.query.pages[0].revisions[0].timestamp;
			lastRevTimestamp = new Date(lastRevTimestamp).getTime();
			lastRevTimestamp = Math.floor(lastRevTimestamp / 1000);
			var pageContent = data.query.pages[0].revisions[0].slots.main.content;	
			if(shownTS > lastRevTimestamp) {
				if(pageContent.search(/={2}[^=].*[^=]={2}\r?\n/) == -1) {
					// no threads in discussion, append at the end
					pageContent += "\n\n" + "== " + newThreadName + " ==\n\n" + newThreadText;
				}
				else {
					// append as the first thread
					pageContent = pageContent.replace(/^==([^=])/m, "\n\n== " + newThreadName + " ==\n\n" + newThreadText + "\n\n==$1");
				}
				
				// write changes
				var params = {
					action: 'edit',
					title: mw.config.get("wgPageName"),
					text: pageContent,
					format: 'json',
					summary: mw.msg('bettercomments-newcomment')
				},
				api = new mw.Api();
				api.postWithToken( 'csrf', params ).done( function ( data ) {
					$( "#bcSuccess" ).appendTo("#newThread");
					$( "#bcSuccess" ).html(mw.msg('bettercomments-success'));
					$( "#bcSuccess" ).removeClass("d-none");
					// redirect to updated article
					setTimeout(function(){ location.href = location.origin + "/w/" + mw.config.get("wgPageName") }, 1000);
				});
			}
			else {
				// handle edit conflict
				$( "#bcDanger" ).appendTo("#newThread");
				$( "#bcDanger" ).prepend(mw.msg('bettercomments-edit-conflict'));
				$( "#bcDanger" ).removeClass("d-none");
				newThreadTextElement.focus();
				newThreadTextElement.select();
				$('.refreshBtn').on( "click", function() {
					location.href = location.origin + "/w/" + mw.config.get("wgPageName");
				});
			}
		});
	});

	// handle newcomment forms
    $('.newCommentForm').submit(function( event ) {
		event.preventDefault();

		var newCommentTextElement = $(this).find(".newCommentText");
		var newCommentText = newCommentTextElement.val();
		newCommentText = newCommentText.replace(/^:/m, "");
		newCommentText = newCommentText.replace(/\r?\n/g, " ");
		if(newCommentText.search(/~~~~/) == -1) newCommentText += " -- ~~~~";
		var shownTS = $(this).parent().data("shownTS"); // timestamp of showing the form
		var cindent = $(this).parent().data("cindent");
		var cpos = $(this).parent().data("cpos");
		var tpos = $(this).parent().data("tpos");
		var parentId = $(this).parent().attr("id");

		// get timestamp of last revision
		$.getJSON( pageAPI, {
    		prop: "revisions",
			titles: mw.config.get("wgPageName"),
			rvslots: "*",
			rvprop: "content|timestamp",
			formatversion: "2",
    		format: "json"
		})
    	.done(function( data ) {
			var lastRevTimestamp = data.query.pages[0].revisions[0].timestamp;
			lastRevTimestamp = new Date(lastRevTimestamp).getTime();
			lastRevTimestamp = Math.floor(lastRevTimestamp / 1000);
			var pageContent = data.query.pages[0].revisions[0].slots.main.content;
			if(shownTS > lastRevTimestamp) {
				var cposnth = 0;
				var tposnth = 0;
				var indent = '';
				var empty = true;
				for(var i=0; i<cindent; i++) indent += ':';
				
				// append comment
				var lines = pageContent.split(/\r?\n/);
				var match;
				var indentLevel = 0;
				for(var i=0;i<lines.length;i++) {
					if(tposnth>0 && (match = lines[i].match(/^(:+)/m))) {
						cposnth++;
						indentLevel = match[0].length;
						if(tpos == tposnth && indentLevel <= cindent && cposnth > cpos) {
							lines[i] = lines[i].replace(/^:/m, indent + ":" + newCommentText + "\n:");
							empty = false;
							break;
						}
					}
					else if(lines[i].match(/^==[^=].*[^=]==/m)) {
						if(tpos == tposnth) {
							lines[i] = lines[i].replace(/^==/m, indent + ":" + newCommentText + "\n\n==");
							empty = false;
							break;
						}
						tposnth++;
					}
				}
				if(empty) {
					pageContent += "\n\n:" + indent + newCommentText;
				}
				else pageContent = lines.join('\n');

				// write changes
				var params = {
					action: 'edit',
					title: mw.config.get("wgPageName"),
					text: pageContent,
					format: 'json',
					summary: mw.msg('bettercomments-newcomment')
				},
				api = new mw.Api();
				api.postWithToken( 'csrf', params ).done( function ( data ) {
					$( "#bcSuccess" ).appendTo("#" + parentId);
					$( "#bcSuccess" ).html(mw.msg('bettercomments-success'));
					$( "#bcSuccess" ).removeClass("d-none");
					// redirect to updated article
					setTimeout(function(){ location.href = location.origin + "/w/" + mw.config.get("wgPageName") }, 800);
				});
			}
			else {
				// handle edit conflict
				$( "#bcDanger" ).appendTo("#" + parentId);
				$( "#bcDanger" ).prepend(mw.msg('bettercomments-edit-conflict'));
				$( "#bcDanger" ).removeClass("d-none");
				newCommentTextElement.focus();
				newCommentTextElement.select();
				$('.refreshBtn').on( "click", function() {
					location.href = location.origin + "/w/" + mw.config.get("wgPageName");
				});
			}
		});
	});

	// update timestamp when making the new thread form visible
	$('#newThread').on('shown.bs.collapse', function () {
		recentTimestamp = Math.floor(Date.now() / 1000);
		$(this).data("shownTS", recentTimestamp);
		$('.newComment').collapse("hide");
		$(this).find('#newThreadName').focus();
	})
	
	// update timestamp when making the new comment form visible
	$('.newComment').on('shown.bs.collapse', function () {
		recentTimestamp = Math.floor(Date.now() / 1000);
		$(this).data("shownTS", recentTimestamp);
		$('#newThread').collapse("hide");
		$('.newComment').not(this).collapse("hide");
		$(this).find('.newCommentText').focus();
	})

	// handle cancel buttons
	$('.newComment').find(".cancelBtn").on( "click", function() {
		$(this).parent().parent().parent().collapse("hide");
	});
	$('#newThread').find(".cancelBtn").on( "click", function() {
		$(this).parent().parent().parent().collapse("hide");
	});
	*/


}( mediaWiki, jQuery ) );
