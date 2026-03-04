<?php

/**
 * All hooked functions used by AnnotateImage
 * @ingroup Extensions
 * @author Josef Martiňák
 */

class AnnotateImageHooks {

	/**
	 * Add "create annotation" button and allow editing at file pages
	 * Show annotations on embedded images
	 * @param object $out: instance of OutputPage
	 * @param object $skin: instance of Skin, unused
	 */
	public static function fireAnnotator( &$out, &$skin ) {

		if ( !$out->isArticle() ) {
			return true;
		}

		$title = $out->getTitle();
		$ns = $title->getNamespace();
		$config = $out->getConfig();
		$allowed = (string)$config->get( 'AllowedExtensions' );
		$minWidth = (int)$config->get( 'MinWidth' );

		// Pass config to JS without injecting hidden DOM nodes.
		$out->addJsConfigVars( 'wgAnnotateImage', [
			'allowedExtensions' => $allowed,
			'minWidth' => $minWidth,
		] );

		if ( $ns === NS_FILE ) {
			// Only enable editor for allowed file extensions.
			if ( preg_match( "/($allowed)$/", $title->getDBkey() ) ) {
				$out->addModules( 'ext.AnnotateImageEdit' );
			}
			return true;
		}

		// Non-file pages: only load embed module when the rendered HTML contains
		// at least one sufficiently large image (width attribute).
		if ( isset( $out->mBodytext ) && preg_match_all( '/<img[^>]*\bwidth="([0-9]+)"/i', $out->mBodytext, $matches, PREG_SET_ORDER ) ) {
			foreach ( $matches as $m ) {
				if ( (int)$m[1] >= $minWidth ) {
					$out->addModules( 'ext.AnnotateImageEmbed' );
					break;
				}
			}
		}
		return true;
	}
}