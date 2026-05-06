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

		// Non-file pages: load the embed module on article pages and let the
		// client-side code filter eligible images. In MediaWiki 1.45 the rendered
		// body HTML is not a stable public OutputPage API, so checking $out->mBodytext
		// here can prevent the module from loading even when the page contains
		// annotable images.
		$out->addModules( 'ext.AnnotateImageEmbed' );
		return true;
	}
}