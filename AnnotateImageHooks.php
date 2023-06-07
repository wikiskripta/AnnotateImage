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

		if( !$out->isArticle() ) return true;

		$title = $out->getTitle();
		$ns = $title->getNamespace();
		$config = $out->getConfig();

		if($ns == 6) {
			if(preg_match("/(" . $config->get("AllowedExtensions") . ")$/", $title->getDBkey())) {
				// fire the editor
				$out->mBodytext .= "<div id='AnnImCofig' class='d-none' data-allowedextensions='" . $config->get("AllowedExtensions") . "' data-minwidth='" . $config->get("MinWidth") . "' data-updated=''></div>";
				$out->addModules('ext.AnnotateImageEdit');
			}
		}
		else {
			// show annotations
			$out->addModules('ext.AnnotateImageEmbed');
			if(preg_match_all("/<img.*?width=\"([0-9]*)\"/", $out->mBodytext, $matches, PREG_SET_ORDER)) {
				foreach ( $matches as $m ) {
					if(intval($m[1]) >= $config->get("MinWidth")) {
						$out->mBodytext .= "<div id='AnnImCofig' class='d-none' data-allowedextensions='" . $config->get("AllowedExtensions") . "' data-minwidth='" . $config->get("MinWidth") . "'></div>";
						$out->addModules('ext.AnnotateImageEmbed');
						break;
					}
				}
			}
		}
		return true;
	}
}