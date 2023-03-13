<?php

error_reporting(E_ALL);
ini_set('display_errors','On');

$title = 'TTYREC viewer';

$fname = (isset($_GET['file']) ? $_GET['file'] : NULL);

print '<!DOCTYPE html><html><head>';
print '<title>'.$title.'</title>';
print '<link rel="stylesheet" type="text/css" href="ttyscreen.css">';
print '<script src="naoterm.js"></script>';
print '<script src="trd.js"></script>';
print '</head><body>';

print '<h1>'.$title.'</h1>';

if (isset($fname)) {
    $fname = rawurldecode($fname);
}

print '<div id="trd_ui"></div>';

print '<script type="text/javascript">';
print 'ajax_load_ttyrec("'.$fname.'");';
print '</script>';


print '</body></html>';

