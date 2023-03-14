<?php

error_reporting(E_ALL);
ini_set('display_errors','On');

$title = 'TTYREC viewer';

print '<!DOCTYPE html><html><head>';
print '<title>'.$title.'</title>';
print '<link rel="stylesheet" type="text/css" href="ttyscreen.css">';
print '<script src="naoterm.js"></script>';
print '<script src="trd.js"></script>';
print '</head><body>';

print '<h1>'.$title.'</h1>';

print '<div id="trd_ui"></div>';

print '<script type="text/javascript">';
print 'ajax_load_ttyrec((new URLSearchParams(window.location.search)).get("file"));';
print '</script>';


print '</body></html>';

