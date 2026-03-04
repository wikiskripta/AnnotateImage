/**
 * Show annotations in embedded images
 *
 * Optimized:
 * - Collect all images first.
 * - Fetch all file pages in batches via action=query (single request per batch).
 * - Apply annotations to matching <img> elements.
 */

( function ( mw, $ ) {

	mw.loader.using( [ 'mediawiki.api' ], function () {
		var cfg = mw.config.get( 'wgAnnotateImage' ) || {};
		var allowedExtensions = cfg.allowedExtensions || $( '#AnnImCofig' ).data( 'allowedextensions' );
		var minWidth = cfg.minWidth || $( '#AnnImCofig' ).data( 'minwidth' );

		function extractFilename( src ) {
			// Keep compatibility with the original parsing logic.
			var s = src;
			var re = new RegExp( '/sites/[^/]*' );
			s = s.replace( re, '' );

			if ( s.includes( '/thumb/' ) ) {
				re = new RegExp( '.*/([^/]*)/[^/]*$' );
			} else if ( s.includes( 'thumb.php' ) ) {
				re = new RegExp( 'f=(.*?)&width' );
			} else {
				re = new RegExp( '.*/([^/]*)$' );
			}

			var match = s.match( re );
			return match ? match[ 1 ] : null;
		}

		function transformText( text ) {
			var re;
			var t = text;
			// internal links
			re = /\[\[ *([^\]]*?) *\| *(.*?) *\]\]/ig;
			t = t.replaceAll( re, '<a href="' + location.origin + '/w/$1">$2</a>' );
			re = /\[\[ *([^\]]*?) *\]\]/ig;
			t = t.replaceAll( re, '<a href="' + location.origin + '/w/$1">$1</a>' );
			// bold
			re = /''' *(.*?)'''/ig;
			t = t.replaceAll( re, '<strong>$1</strong>' );
			// em
			re = /'' *(.*?)''/ig;
			t = t.replaceAll( re, '<em>$1</em>' );
			// ul
			re = /(\r\n|\r|\n)\* */ig;
			t = t.replaceAll( re, '\r\n&bull;&nbsp;' );
			// dt
			re = /(\r\n|\r|\n); *([^\r\n]*)/ig;
			t = t.replaceAll( re, '\r\n<strong>$2</strong>' );
			// dd
			re = /(\r\n|\r|\n): */ig;
			t = t.replaceAll( re, '\r\n&nbsp;&nbsp;' );
			// br
			re = /(\r|\n)/ig;
			t = t.replaceAll( re, '<br>' );
			return t;
		}

		function parseAnnotations( wikitext ) {
			var re = /\{\{ImageNote\|id=([0-9]*)\|x=([0-9]*)\|y=([0-9]*)\|w=([0-9]*)\|h=([0-9]*)\|dimx=([0-9]*)\|dimy=([0-9]*)[^\}]*}}([^\{]*)\{\{ImageNoteEnd\|id=[0-9]*[^\}]*}}/g;
			return [ ...wikitext.matchAll( re ) ];
		}

		// Collect candidate images and group them by filename.
		var files = new Map(); // filename -> { title: 'File:...', items: [ { img, width, height } ] }
		var extRe = new RegExp( '\\.(' + allowedExtensions + ')$' );

		$( 'img' ).each( function () {
			var $img = $( this );
			if ( $img.data( 'annotateImageLoaded' ) ) {
				return;
			}
			var width = $img.attr( 'width' );
			var height = $img.attr( 'height' );
			if ( width === undefined || height === undefined ) {
				return;
			}
			width = parseInt( width, 10 );
			height = parseInt( height, 10 );
			if ( !width || width < minWidth ) {
				return;
			}
			var filename = extractFilename( $img.attr( 'src' ) || '' );
			if ( !filename ) {
				return;
			}
			filename = decodeURI( filename );
			if ( !filename.match( extRe ) ) {
				return;
			}

			if ( !files.has( filename ) ) {
				files.set( filename, {
					title: 'File:' + filename,
					items: []
				} );
			}
			files.get( filename ).items.push( { img: $img, width: width, height: height } );
		} );

		if ( files.size === 0 ) {
			return;
		}

		var api = new mw.Api();
		var titles = Array.from( files.values() ).map( function ( f ) { return f.title; } );
		var batchSize = 50;

		function fetchBatch( batchTitles ) {
			return api.get( {
				action: 'query',
				prop: 'revisions',
				rvprop: 'content',
				rvslots: 'main',
				formatversion: '2',
				titles: batchTitles.join( '|' ),
				format: 'json'
			} );
		}

		function applyForPage( page ) {
			if ( !page || !page.title ) {
				return;
			}
			var filename = page.title.replace( /^File:/, '' );
			if ( !files.has( filename ) ) {
				return;
			}
			var rev = page.revisions && page.revisions[ 0 ];
			var content = rev && rev.slots && rev.slots.main && rev.slots.main.content;
			if ( !content ) {
				return;
			}

			var annotations = parseAnnotations( content );
			if ( annotations.length === 0 ) {
				return;
			}

			files.get( filename ).items.forEach( function ( item ) {
				var arr = [];
				annotations.forEach( function ( annot ) {
					var id = annot[ 1 ];
					var x = parseFloat( annot[ 2 ] );
					var y = parseFloat( annot[ 3 ] );
					var w = parseFloat( annot[ 4 ] );
					var h = parseFloat( annot[ 5 ] );
					var dimx = parseFloat( annot[ 6 ] );
					var dimy = parseFloat( annot[ 7 ] );
					var text = transformText( ( annot[ 8 ] || '' ).trim() );

					arr.push( {
						top: Math.round( y * item.height / dimy ),
						left: Math.round( x * item.width / dimx ),
						width: Math.round( w * item.width / dimx ),
						height: Math.round( h * item.height / dimy ),
						text: text,
						id: id,
						editable: false
					} );
				} );

				if ( arr.length === 0 ) {
					return;
				}

				item.img.data( 'annotateImageLoaded', true );
				item.img.annotateImage( {
					editable: false,
					notes: arr
				} );

				// Add info once per image.
				var info = "<div class='d-flex flex-row small lh-sm mt-2'><img src='https://www.wikiskripta.eu/images/d/d0/Anotace_ikona.svg' alt='annotation' width='35' class='me-2' style='pointer-events: none;'>";
				var re = new RegExp( '#BR#' );
				info += "<div class=''>" + mw.message( 'annotateimage-info' ).text().replace( re, '<br>' ) + "</div>\n</div>";
				$( info ).insertAfter( item.img.parent() );
			} );
		}

		// Fetch all batches sequentially (keeps load predictable).
		var chain = $.Deferred().resolve();
		for ( var i = 0; i < titles.length; i += batchSize ) {
			( function ( batchTitles ) {
				chain = chain.then( function () {
					return fetchBatch( batchTitles ).done( function ( data ) {
						var pages = data && data.query && data.query.pages ? data.query.pages : [];
						pages.forEach( applyForPage );
					} );
				} );
			} )( titles.slice( i, i + batchSize ) );
		}

	} );

}( mediaWiki, jQuery ) );
