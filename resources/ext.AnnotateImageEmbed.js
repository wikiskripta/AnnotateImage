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

		function safeDecode( value ) {
			try {
				return decodeURIComponent( value );
			} catch ( e ) {
				return value;
			}
		}

		function normalizeFilenameKey( filename ) {
			return safeDecode( filename || '' ).replace( /_/g, ' ' );
		}

		function getRenderedSize( $img ) {
			var el = $img[ 0 ];
			var rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
			var width = rect.width || parseFloat( $img.css( 'width' ) ) || parseFloat( $img.attr( 'width' ) ) || el.naturalWidth || 0;
			var height = rect.height || parseFloat( $img.css( 'height' ) ) || parseFloat( $img.attr( 'height' ) ) || el.naturalHeight || 0;

			if ( !height && width && el.naturalWidth && el.naturalHeight ) {
				height = Math.round( width * el.naturalHeight / el.naturalWidth );
			}
			if ( !width && height && el.naturalWidth && el.naturalHeight ) {
				width = Math.round( height * el.naturalWidth / el.naturalHeight );
			}

			return {
				width: Math.round( width ),
				height: Math.round( height )
			};
		}

		function extractAnnotationParam( header, name ) {
			var re = new RegExp( '\\|' + name + '=([^|}]*)' );
			var match = ( header || '' ).match( re );
			return match ? match[ 1 ].trim() : '';
		}

		function normalizeUrl( url ) {
			url = ( url || '' ).trim();
			if ( !url ) {
				return '';
			}
			if ( url.indexOf( '//' ) === 0 ) {
				return location.protocol + url;
			}
			if ( /^(https?:|mailto:)/i.test( url ) ) {
				return url;
			}
			if ( url.charAt( 0 ) === '/' ) {
				return location.origin + url;
			}
			return location.origin + '/w/' + encodeURIComponent( url ).replace( /%2F/g, '/' );
		}

		function extractFilename( src ) {
			var s = ( src || '' ).split( '#' )[ 0 ].split( '?' )[ 0 ];
			var match;

			if ( s.indexOf( '/thumb/' ) !== -1 ) {
				// MediaWiki thumb URL: /images/thumb/a/ab/File_name.jpg/300px-File_name.jpg
				match = s.match( /\/thumb\/(?:[^/]+\/){2}([^/]+)\// );
				if ( match ) {
					return safeDecode( match[ 1 ] );
				}
			}

			match = ( src || '' ).match( /[?&]f=([^&]+)/ );
			if ( match ) {
				return safeDecode( match[ 1 ] );
			}

			match = s.match( /\/([^/]+)$/ );
			return match ? safeDecode( match[ 1 ] ) : null;
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
			var re = /\{\{ImageNote(\|id=([0-9]*)\|x=([0-9]*)\|y=([0-9]*)\|w=([0-9]*)\|h=([0-9]*)\|dimx=([0-9]*)\|dimy=([0-9]*)[^\}]*)}}([^\{]*)\{\{ImageNoteEnd\|id=[0-9]*[^\}]*}}/g;
			return [ ...wikitext.matchAll( re ) ];
		}

		// Collect candidate images and group them by filename.
		var files = new Map(); // normalized filename -> { title: 'File:...', items: [ { img, width, height } ] }
		var extRe = new RegExp( '\\.(' + allowedExtensions + ')$' );

		$( 'img' ).each( function () {
			var $img = $( this );
			if ( $img.data( 'annotateImageLoaded' ) ) {
				return;
			}
			var size = getRenderedSize( $img );
			var width = size.width;
			var height = size.height;
			if ( !width ) {
				return;
			}
			if ( !height ) {
				height = Math.round( width );
			}
			var filename = extractFilename( $img.attr( 'src' ) || '' );
			if ( !filename ) {
				return;
			}
			if ( !filename.match( extRe ) ) {
				return;
			}

			var key = normalizeFilenameKey( filename );
			if ( !files.has( key ) ) {
				files.set( key, {
					title: 'File:' + key,
					items: []
				} );
			}
			files.get( key ).items.push( { img: $img, width: width, height: height } );
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
			var filename = page.title.replace( /^(File|Soubor):/, '' );
			var key = normalizeFilenameKey( filename );
			if ( !files.has( key ) ) {
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

			files.get( key ).items.forEach( function ( item ) {
				var arr = [];
				var liveSize = getRenderedSize( item.img );
				item.width = liveSize.width || item.width;
				item.height = liveSize.height || item.height || item.width;
				annotations.forEach( function ( annot ) {
					var header = annot[ 1 ];
					var id = annot[ 2 ];
					var x = parseFloat( annot[ 3 ] );
					var y = parseFloat( annot[ 4 ] );
					var w = parseFloat( annot[ 5 ] );
					var h = parseFloat( annot[ 6 ] );
					var dimx = parseFloat( annot[ 7 ] );
					var dimy = parseFloat( annot[ 8 ] );
					var text = transformText( ( annot[ 9 ] || '' ).trim() );
					var url = normalizeUrl( extractAnnotationParam( header, 'url' ) );

					arr.push( {
						top: Math.round( y * item.height / dimy ),
						left: Math.round( x * item.width / dimx ),
						width: Math.round( w * item.width / dimx ),
						height: Math.round( h * item.height / dimy ),
						text: text,
						url: url,
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
