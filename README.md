# AnnotateImage

Mediawiki extension.

## Description

* Version 0.1
* Image can be annotated at the image's page.
* JPG and PNG allowed.
* Annotations are visible also inside the embedded images.
* Extension is designed to use the syntax of [ImageAnnotator from wikimedia](https://commons.wikimedia.org/wiki/Help:Image-Annotator). Older annotations should still work.

```
Example of syntax (we don't use the style attribute anymore):

{{ImageNote|id=1|x=215|y=187|w=20|h=67|dimx=640|dimy=480|style=2}}
víceřadý cylindrický epitel s řasinkami a [[Pohárková buňka|pohárkovými bb.]]
{{ImageNoteEnd|id=1}}
``` 

## Installation

* Make sure you have MediaWiki 1.39+ installed.
* Your skin should use bootstrap 5.
* Download and place the extension to your _/extensions/_ folder.
* Add the following code to your LocalSettings.php: `wfLoadExtension( 'AnnotateImage' )`;
* In case you're using [ImageAnnotator from wikimedia](https://commons.wikimedia.org/wiki/Help:Image-Annotator), please deactivate it.
* Text in edit windows comes from MediaWiki:ImageAnnotatorCopyright.

## Internationalization

This extension is available in English and Czech language. For other languages, just edit files in /i18n/ folder.

## Authors and license

* [Josef Martiňák](https://www.wikiskripta.eu/w/User:Josmart)
* MIT License, Copyright (c) 2023 First Faculty of Medicine, Charles University

## Third party plugins and libraries

* [An Image Annotation plugin for jQuery](https://github.com/flipbit/jquery-image-annotate)
* [jQuery UI](https://jqueryui.com/)

## Poznámky

* Použít obrázek https://www.wikiskripta.eu/w/Soubor:Anotace_ikona.svg
* Zkusit to upravit, ať se to obejde bez jquery-ui
* V extensions.json tahat jen ext.js a ostatní potřebné tahat až podle toho, jestli jsou na stránce nějaké obrázky (mw.load?)

