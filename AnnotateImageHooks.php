<?php

/**
 * All hooked functions used by AnnotateImage
 * @ingroup Extensions
 * @author Josef Martiňák
 */

class AnnotateImageHooks {

	/**
	 * Add "create annotation" button and allow adits at file pages
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
			if(preg_match("/(" . $config->get("AllowedExtensions") . ")$/i", $title->getDBkey())) {
				// fire the editor

				
				$out->addModules('ext.AnnotateImageEdit');
			}
		}
		else {
			// show annotations
			$out->addModules('ext.AnnotateImageEmbed');
			if(preg_match_all("/<img.*?width=\"([0-9]*)\"/", $out->mBodytext, $matches, PREG_SET_ORDER)) {
				foreach ( $matches as $m ) {
					if(intval($m[1]) > 200) {
						$out->mBodytext .= "<div id='AnnImCofig' class='d-none' data-allowedextensions='" . $config->get("AllowedExtensions") . "' data-minwidth='" . $config->get("MinWidth") . "'></div>";
						$out->addModules('ext.AnnotateImageEmbed');
						break;
					}
				}
			}
		}
		return true;
		
		/*
		$alerts = "<div id='bcDanger' class='alert alert-danger d-none mt-3 mb-3' role='alert'><br><button class='btn btn-secondary btn-sm refreshBtn mt-2'>" . wfMessage( "bettercomments-refresh" )->plain() . "</button></div>\n";
		$alerts .= "<div id='bcSuccess' class='alert alert-success d-none mt-3 mb-3' role='alert'></div>\n";

		$form = "<div class='mb-4'><p>\n";
		$form .= "<button class='btn btn-primary' id='newThreadBtn' type='button' data-toggle='collapse' data-target='#newThread' aria-expanded='false' aria-controls='newThread'>";
		$form .= wfMessage( "bettercomments-newthread" )->plain() . "</button>\n";
		$form .= "</p>\n";
		$form .= "<div class='collapse' id='newThread' data-shownTS=''>\n";
		$form .= "<form id='newThreadForm'><div class='form-group'>\n";
		$form .= "<input class='form-control mb-2' type='text' id='newThreadName' placeholder='" . wfMessage( "bettercomments-name" )->plain() . "' required>\n";
		$form .= "<textarea class='form-control mb-2' style='height:200px;' id='newThreadText' placeholder='" . wfMessage( "bettercomments-text" )->plain() . "' required></textarea>\n";
		$form .= "<button class='btn btn-primary mr-2' type='submit' id='threadSubmitBtn'>";
        $form .= wfMessage( "bettercomments-save" )->plain() . "</button>\n";
        $form .= "<button class='btn btn-secondary cancelBtn' type='button'>" . wfMessage( "bettercomments-cancel" )->plain() . "</button>";
		$form .= "</div></form>\n";
		$form .= "</div></div>\n";
		if(preg_match("/<h2>.*?<\/h2>/", $out->mBodytext)) {
			// append new thread form
			$out->mBodytext = preg_replace("/<h2>(?!Obsah|Contents)/", "<br>" . $alerts . $form . "<h2>", $out->mBodytext, 1);
			// replace #bcanswer with buttons
			$out->mBodytext = preg_replace("/<span class=\"d-none bcanswer\" data-cindent=\"([0-9]*)\" data-cpos=\"([0-9]*)\" data-tpos=\"([0-9]*)\"><\/span>/", 
				"<button class='btn btn-link pl-0 my-0 py-0 ml-1' type='button' data-toggle='collapse' data-target='#newComment$1$2$3' aria-expanded='false' aria-controls='newComment'>"
				. wfMessage( "bettercomments-answer" )->plain() . "</button><div class='collapse newComment mt-0 mb-0' id='newComment$1$2$3' data-shownTS='' data-cindent='$1' data-cpos='$2' data-tpos='$3'>\n<form class='newCommentForm'>
				<div class='form-group'>\n<textarea class='form-control mb-2 newCommentText' style='height:200px;' placeholder='" . wfMessage( "bettercomments-text" )->plain() . "' required></textarea>\n
				<button class='btn btn-primary mr-2' type='submit'>" . wfMessage( "bettercomments-save" )->plain() . "</button><button class='btn btn-secondary cancelBtn' type='button'>" . wfMessage( "bettercomments-cancel" )->plain() . "</button>\n</div></form>\n</div>\n",
				$out->mBodytext);
		}
		else {
			// no threads in discussion, append at the end
			$out->mBodytext .= $alerts . $form;
		}
		*/
	}
}