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

print '<div>';

print '<p>Playing file <span id="current_ttyrec_link"></span>';
print '<p>';

print '
[<button type="button" onclick="toggle_pause_playback();" id="pause_button_text">pause</button>
 <button type="button" onclick="toggle_debug();" id="debug_button">debug</button>]
[<a href="#" onclick="show_screen_html();">show screen data</a>]
<br>
<b>Speed:</b><span id="speed_slider"></span><span id="speed_display"></span>
-- 
<b>Frame:</b>[<button type="button" onclick="goto_first_frame();">&#x23ee;</button><!--<button type="button" onclick="show_prev_frame();">&lt;</button>--><span id="frame_display"></span><button type="button" onclick="show_next_frame();">&gt;</button>]
-- 
<b>Term size:</b>[<span id="termsize_display"></span>]
<br>
<b>Time:</b><span id="frame_time_display"></span>
-- 
<b>Total playing time:</b><span id="frame_playtime_display"></span>
-- 
<b>Delay:</b><span id="frame_delay_display"></span>
';

print '</div>';

print '<div id="tty_loader_div"></div>';
print '<div id="ttyscreen_html_div"></div>';


print '<div id="debugdiv"></div>';


print '<script type="text/javascript">';
print 'ajax_load_ttyrec("'.$fname.'");';
print '</script>';


print '</body></html>';

