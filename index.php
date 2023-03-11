<?php


error_reporting(E_ALL);
ini_set('display_errors','On');


$title = 'TTYREC viewer';

$fname = (isset($_GET['file']) ? $_GET['file'] : NULL);
$pos = (isset($_GET['pos']) ? $_GET['pos'] : NULL);

if (!$fname) {
    $fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-02-24.03:25:30.ttyrec.gz";
    //$fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-02-16.19:06:03.ttyrec.gz";
    // $fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-03-08.19:38:00.ttyrec.gz";
    //$fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-03-04.21:24:01.ttyrec.gz";
    //$fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-03-06.19:52:47.ttyrec.gz";
    //$fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-01-07.18:22:13.ttyrec.gz";
    //$fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2022-06-22.18:51:13.ttyrec.gz";
    //$fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-03-09.18-44-25.ttyrec.gz";
    //$fname = "http://127.0.0.1/~paxed/trd/ttyrecs/2023-03-10.10-10-25.ttyrec.gz";
}

print '<!DOCTYPE html><html><head>';
print '<title>'.$title.'</title>';
print '<link rel="stylesheet" type="text/css" href="ttyscreen.css">';
print '<script src="naoterm.js"></script>';
print '<script src="trd.js"></script>';
print '</head><body>';

print '<h1>'.$title.'</h1>';
echo '<p>DECgraphics and IBMgraphics might mess up the decoding.';

echo '<p>Better way to watch the ttyrecs is to use a native program for playback. For linux and other sensible OSes, there\'s';
echo ' <a href="http://www.stack.nl/~jilles/games/playttyrec.c">playttyrec.c</a> by Jilles Tjoelker,';
echo ' <a href="http://www.chiark.greenend.org.uk/~sgtatham/ipbt/">IPBT</a> by Simon Tatham,';
echo ' <a href="http://patch-tag.com/r/ais523/jettyplay">Jettyplay</a> by Alex Smith,';
echo ' <a href="http://0xcc.net/ttyrec/">ttyplay and ttyrec</a> by Satoru Takabayashi, and others.';
echo ' For Windows, you can use <a href="http://angband.pl/termrec.html">termplay</a>.';
print '<p>';

if (isset($fname)) {
    $fname = rawurldecode($fname);
} else {
    unset($pos);
}

if (isset($pos) && !preg_match('/^[0-9]+$/', $pos)) unset($pos);

print '<div>';

print '<p>Playing file <span id="current_ttyrec_link"></span>';
print '<p id="current_player_ttyrecs">';
print '<p>';

print '
[<button type="button" onclick="toggle_pause_playback();" id="pause_button_text">pause</button>
 <button type="button" onclick="toggle_debug();" id="debug_button">debug</button>]
[<a href="#" onclick="show_screen_html();">show screen data</a>]
<br>
<b>Speed:</b>[<button type="button" onclick="adj_speed(-1);">&lt;</button><span id="speed_display"></span><button type="button" onclick="adj_speed(1);">&gt;</button>]
-- 
<b>Frame:</b>[<!--<button type="button" onclick="show_prev_frame();">&lt;</button>--><span id="frame_display"></span><button type="button" onclick="show_next_frame();">&gt;</button>]
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
if (!isset($fname)) {
    print 'ajax_load_random_ttyrec("tty_loader_div");';
} else {
    print 'ajax_load_ttyrec("'.$fname.'", "tty_loader_div");';
}
print '</script>';


print '</body></html>';

