
var NAOTERM_URL = "";
var DEBUG_INFO = 0; /* 0: off, 1: on, clear every frame, 2: on, concatenate */
var SPEED = { min: 20, current: 500, max: 1000, step: 20 };
var MAX_PAUSE = 1500;
var PAUSE_INITIAL = 0;
var CACHEFRAMES = { n_previous: 10, every_nth: 50, max: 500 };
var PAUSE_UNHANDLED = 0; /* pause playback when encountering unhandled escape code? */
var XTWINOPS_resize = 0; /* 1: allow term resize via escape code, 0: resize when necessary */
var OSC_color_change = 1; /* 1: allow changing term colors with esc codes */
var ENABLE_RND_TTYREC = 1; /* 1: get "random" ttyrec via rndttyrec.php */
var ENABLE_SCREEN_CACHE = 1;

/* ******************* */

var naoterm_params = { 'pause_on_unhandled': PAUSE_UNHANDLED,
                       'XTWINOPS_resize': XTWINOPS_resize,
                       'OSC_color_change': OSC_color_change };
var naoterminal = new naoterm(naoterm_params);
var current_ttyrec = -1;
var paused = PAUSE_INITIAL;
var current_frame = 0;
var first_cached_frame = -1;
var last_cached_frame = -1;
var n_cached_frames = 0;
var ttyrec_frames = new Array();

var trd_ui_created = 0;

function $(e) { return document.getElementById(e); }

function create_ui()
{
    if (trd_ui_created)
        return;

    btn = $("trd_ui");
    if (!btn) {
        console.error("No trd_ui id");
        trd_ui_created = 1;
    }
    btn.innerHTML += '<div id="trd_ui_controls">';
    btn.innerHTML += '<div>Playing file <span id="current_ttyrec_link"></span></div>';
    btn.innerHTML += '<div>';
    btn.innerHTML += '<span id="btn_first"></span>';
    btn.innerHTML += '<span id="btn_prev"></span>';
    btn.innerHTML += '<span id="btn_pause"></span>';
    btn.innerHTML += '<span id="btn_next"></span>';
    btn.innerHTML += '<span id="btn_last"></span>';
    if (ENABLE_RND_TTYREC) {
        btn.innerHTML += '<span class="divider"> | </span>';
        btn.innerHTML += '<span id="btn_rnd_ttyrec"></span>';
    }
    btn.innerHTML += '<span class="divider"> | </span>';
    btn.innerHTML += '<span id="btn_debug"></span>';
    btn.innerHTML += '<span id="btn_screendata"></span>';
    btn.innerHTML += '<span id="btn_download"></span>';
    btn.innerHTML += '<span class="divider"> | </span>';
    btn.innerHTML += '<span id="speed_slider"></span>';
    btn.innerHTML += '</div>';
    btn.innerHTML += '<div id="trd_ui_info">';
    btn.innerHTML += '<span><b>Frame: </b><span id="frame_display"></span></span>';
    btn.innerHTML += '<span> <b>Size: </b><span id="termsize_display"></span></span>';
    btn.innerHTML += '<span> <b>Time: </b><span id="frame_time_display"></span></span>';
    btn.innerHTML += '<span> <b>Played: </b><span id="frame_playtime_display"></span></span>';
    btn.innerHTML += '<span> <b>Delay: </b><span id="frame_delay_display"></span></span>';
    btn.innerHTML += '</div>';
    btn.innerHTML += '</div>';
    btn.innerHTML += '<div id="tty_loader_div"></div>';
    btn.innerHTML += '<div id="ttyscreen_html_div"></div>';
    btn.innerHTML += '<div id="debugdiv"></div>';
    btn.innerHTML += '<img id="trd_screenshot_img">';

    btn = $("speed_slider");
    if (btn) {
        btn.innerHTML = "<span id='speed_slider'>Speed: <input id='speed_slider_input' type='range' min='"+SPEED.min+"' max='"+SPEED.max+"' value='"+SPEED.current+"' step='"+SPEED.step+"'></input><span id='speed_display'></span></span>";
    }

    btn = $("btn_first");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="goto_first_frame();">&#x23ee;</button>';
    }

    btn = $("btn_prev");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="show_prev_frame();">&lt;</button>';
    }

    btn = $("btn_next");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="show_next_frame();">&gt;</button>';
    }

    btn = $("btn_last"); /* or as close as we can get ... */
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="goto_last_frame();">&#x23ed;</button>';
    }

    btn = $("btn_pause");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="toggle_pause_playback();" id="pause_button">&#x23f8;</button>';
    }

    btn = $("btn_debug");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="toggle_debug();" id="debug_button">debug</button>';
    }

    btn = $("btn_screendata");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="show_screen_html();" id="screendata_button">screen data</button>';
    }

    btn = $("btn_download");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="download_screen_png();" id="download_png_button">download png</button>';
    }


    btn = $("btn_rnd_ttyrec");
    if (btn) {
        btn.innerHTML = '<button type="button" onclick="window.location.search=\'\';" id="rnd_ttyrec_button">&#x1f500;</button>';
    }

    toggle_pause_btn();

    trd_ui_created = 1;
}

function show_current_frame()
{
    var frame = ttyrec_frames[current_frame];

    if (frame == undefined)
        return;

    debugwrite("<hr>", (DEBUG_INFO == 1) ? 1 : 0);
    debugwrite("Frame #"+current_frame+": pos:"+frame.pos+",time:"+frame.time+"(delay:"+frame.delay+"),pagelen:"+frame.pagelen);

    if (naoterminal == undefined) {
        naoterminal = new naoterm(naoterm_params);
    }
    if (frame.term) {
        naoterminal.copyFrom(frame.term);
        debugwrite("[screen from cache]");
    } else {
        naoterminal.writestr(frame.data);
        if (ENABLE_SCREEN_CACHE) {
            ttyrec_frames[current_frame].term = naoterminal.copy();
            if (last_cached_frame < current_frame)
                last_cached_frame = current_frame;
            n_cached_frames++;
        }
    }
    $("tty_loader_div").innerHTML = naoterminal.get_html();

    btn = $("frame_display");
    if (btn) {
	btn.innerHTML = current_frame.toString()+"/"+ttyrec_frames.length.toString();
    }

    btn = $("termsize_display");
    if (btn)
	btn.innerHTML = naoterminal.SCREEN_WID.toString()+"x"+naoterminal.SCREEN_HEI.toString();

    btn = $("speed_display");
    if (btn)
	btn.innerHTML = SPEED.current.toString();

    var btn = $("frame_time_display");
    if (btn) {
        var framedatetime = new Date(frame.time * 1000);
	btn.innerHTML = framedatetime.toISOString();
    }
    btn = $("frame_playtime_display");
    if (btn)
	btn.innerHTML = timediff(ttyrec_frames[0].time, frame.time);

    btn = $("frame_delay_display");
    if (btn)
	btn.innerHTML = frame.delay.toString()+"s";

    show_debug_info();
}

function update_cached_frames()
{
    if (current_frame > CACHEFRAMES.n_previous) {
        if (ttyrec_frames[current_frame - CACHEFRAMES.n_previous].term != undefined) {
            if (((current_frame - CACHEFRAMES.n_previous) % CACHEFRAMES.every_nth) != 0) {
                delete ttyrec_frames[current_frame - CACHEFRAMES.n_previous].term;
                n_cached_frames--;
            }
        }
        if (CACHEFRAMES.max > 0 && n_cached_frames > CACHEFRAMES.max) {
            if (first_cached_frame < 1)
                first_cached_frame = 1;
            if (last_cached_frame < 1)
                last_cached_frame = ttyrec_frames.length;
            for (var i = first_cached_frame;
                 (i < last_cached_frame) && (n_cached_frames > CACHEFRAMES.max);
                 i++) {
                if (ttyrec_frames[i].term) {
                    delete ttyrec_frames[i].term;
                    first_cached_frame = i;
                    if (last_cached_frame == i)
                        last_cached_frame = -1;
                    n_cached_frames--;
                }
            }
        }
    }
}

/* find frame before current one which is cached or has a clrscr */
function find_prev_cached()
{
    var ret = current_frame;
    while (ret-- > 0) {
        if (ttyrec_frames[ret].term != undefined
            || ttyrec_frames[ret].clrscr)
            break;
    }
    return ret;
}

function show_next_frame()
{
    toggle_pause_playback(1);
    if (current_frame < ttyrec_frames.length - 1) {
        update_cached_frames();
        current_frame++;
        show_current_frame();
    }
}

function show_prev_frame()
{
    toggle_pause_playback(1);
    if (current_frame > 0) {
        update_cached_frames();
        current_frame = find_prev_cached();
        show_current_frame();
    }
}

function play_next_frame()
{
    if (naoterminal.paused) {
        toggle_pause_playback(1);
        return;
    }
    if (current_frame < ttyrec_frames.length - 1) {
        update_cached_frames();
        current_frame++;
        show_current_frame();
    } else {
        toggle_pause_playback(1);
        show_current_frame();
    }
}

function goto_first_frame()
{
    toggle_pause_playback(1);
    current_frame = 0;
    if (naoterminal) {
        delete naoterminal;
        naoterminal = undefined;
    }
    show_current_frame();
}

function goto_last_frame()
{
    toggle_pause_playback(1);
    current_frame = ttyrec_frames.length - 1;
    while (!ttyrec_frames[current_frame].clrscr
           && current_frame > 0) {
        current_frame--;
    }
    if (naoterminal) {
        delete naoterminal;
        naoterminal = undefined;
    }
    show_current_frame();
}

function toggle_pause_btn()
{
    if (paused) {
        $("pause_button").innerHTML = "&#x23f5;";
        $("pause_button").classList.add('selected');
    } else {
        $("pause_button").innerHTML = "&#x23f8;";
        $("pause_button").classList.remove('selected');
    }
}

function toggle_pause_playback(state)
{
    if (state != undefined)
        paused = state;
    else
        paused = !paused;
    toggle_pause_btn();
    if (!paused) {
        naoterminal.paused = 0;
        playback_ttyrec();
    }
    return false;
}

function toggle_debug(state)
{
    if (state != undefined)
        show_debugging_info = state;
    else
        show_debugging_info = !show_debugging_info;
    if (show_debugging_info) {
        $("debug_button").classList.add('selected');
    } else {
        $("debug_button").classList.remove('selected');
    }
    return false;
}

function set_speed(val)
{
    if (s < 0 || (SPEED.min > 0 && s < SPEED.min))
        return;
    if (SPEED.max > 0 && s > SPEED.max)
        return;
    SPEED.current = s;
    btn = $("speed_display");
    if (btn)
	btn.innerHTML = SPEED.current.toString();
}

playback_timer_count = 0;
function playback_timer()
{
    if (playback_timer_count == 1 && !paused) {
        play_next_frame();
        playback_ttyrec();
    }
    playback_timer_count--;
}

function playback_ttyrec()
{
    if (paused)
        return;

    if (ttyrec_frames.length < 1) {
        load_random_ttyrec();
        return;
    }

    if (ttyrec_frames[current_frame] == undefined)
        return;

    var frame = ttyrec_frames[current_frame];

    btn = $("speed_slider_input");
    if (btn)
        SPEED.current = btn.value;

    var delay = (frame.delay + 1) * SPEED.current;
    if (delay > MAX_PAUSE)
        delay = MAX_PAUSE;

    playback_timer_count++;
        setTimeout(playback_timer, delay);
}

function getCSStext()
{
    var s = '';
    const ruleList = document.styleSheets[0].cssRules;

    for (const rule of ruleList) {
        s = s + "\n" + rule.cssText;
    }

    return s;
}

function renderDomToImg(img,dom)
{
    var size = img.getBoundingClientRect();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+size.width+'" height="'+size.height+'"><style>'+getCSStext()+'</style><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">'+dom.innerHTML+'</div></foreignObject></svg>';

    const svgBlob = new Blob( [svg], { type: 'image/svg+xml;charset=utf-8' } );
    const svgObjectUrl = URL.createObjectURL( svgBlob );

    const oldSrc = img.src;
    if( oldSrc && oldSrc.startsWith( 'blob:' ) ) { // See https://stackoverflow.com/a/75848053/159145
        URL.revokeObjectURL( oldSrc );
    }

    img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0,0);

        var link = document.createElement('a');
        link.download = 'trd-'+Date.now()+'.png';
        link.href = canvas.toDataURL();
        link.click();
        img.style.display = 'none';
    }

    img.src = svgObjectUrl;
}

function download_screen_png()
{
    var img = $('trd_screenshot_img');
    var screen = $('tty_loader_div');
    var size = screen.firstChild.getBoundingClientRect();
    img.style.display = 'block';
    img.width = size.width;
    img.height = size.height;
    renderDomToImg(img, screen);
}

var toggle_show_screen_html = 0;
function show_screen_html()
{
    var btn = $("ttyscreen_html_div");
    if (!btn) return;
    toggle_pause_playback(1);
    switch (toggle_show_screen_html) {
    default:
	toggle_show_screen_html = 0;
	btn.innerHTML = '';
	break;
    case 0:
	toggle_show_screen_html = 1;
	btn.innerHTML = '<h4>Screen data in HTML format</h4><textarea rows="24" cols="80">'+naoterminal.get_html()+'</textarea>';
	break;
    case 1:
	toggle_show_screen_html = 2;
	btn.innerHTML = '<h4>Screen data in <a href="https://nethackwiki.com/">wiki</a> format</h4><textarea rows="24" cols="80">'+naoterminal.get_wiki()+'</textarea>';
	break;
    }
}


function load_random_ttyrec()
{
	toggle_pause_playback(1);
	ajax_load_random_ttyrec();
}

function timediff(t1, t2)
{
    var diff = t2 - t1;

    var days = Math.floor(diff/60/60/24);
    diff -= days*60*60*24;

    var hours = Math.floor(diff/60/60);
    diff -= hours*60*60;

    var mins = Math.floor(diff/60);
    diff -= mins*60;

    var secs = Math.floor(diff);

    var str = '';
    if (days > 0) str += days+" days, ";
    if (hours > 0) str += hours+"h ";
    if (mins > 0) str += mins+"m";
    str += secs+"s";
    return str;
}

String.prototype.get_long = function(pos, len)
{
    var tmp = 0;
    switch (len) {
    default:
    case 4: tmp |= (this.charCodeAt(pos+3) << 24);
    case 3: tmp |= (this.charCodeAt(pos+2) << 16);
    case 2: tmp |= (this.charCodeAt(pos+1) << 8);
    case 1: tmp |= (this.charCodeAt(pos));
    }
    return tmp;
}

String.prototype.trim = function() {
    var s = this.replace(/^\s+/, '');
    for (var i = s.length - 1; i >= 0; i--) {
	if (/\S/.test(s.charAt(i))) {
	    s = s.substring(0, i + 1);
	    break;
	}
    }
    return s;
}

var first_delay = 1;
var starttime = 0;
function reset_frame_delay()
{
    first_delay = 1;
    starttime = 0;
}

function calc_frame_delay(delay)
{
    var ret = 1;
    if (first_delay) {
	starttime = delay;
	first_delay = 0;
    } else {
	var tmp = delay;
	ret = (delay - starttime);
	starttime = tmp;
    }
    if (ret < 1)
        ret = 1;
    return ret;
}

function parse_ttyrec(data)
{
    var frames = [];
    var pos = 0;
    var datalen = data.length;
    var framenum = 0;
    /* generally clear screen is done one of two ways:
       1) "ESC [ 2 J"  (a full screen clear)
       2) "ESC [ H" followed by "ESC [ J" (move cursor to 0,0, clear screen down from cursor)
       this regex matches either of those: */
    var re_clrscr = /(\033\[2J|\033\[H\033\[J)/;

    while (pos < datalen) {
        var framepos = pos;
        var time = data.get_long(pos); pos += 4;
        var time_usec = data.get_long(pos); pos += 4;
        var pagelen = data.get_long(pos); pos += 4;
        var frame = data.slice(pos, pos + pagelen); pos += pagelen;

        var delay = calc_frame_delay(time);
        var clrscr = re_clrscr.test(frame);

        frames.push({ "pos": framepos, "time": time, "delay":delay, "pagelen": pagelen,
                      "data": frame, "clrscr": clrscr });
        framenum++;
    }
    return frames;
}

function loading_ttyrec()
{
    if (req.readyState == 4) { // Complete
	if (req.status == 200) { // OK response
	    if (!naoterminal) {
		$("tty_loader_div").innerHTML = req.responseText;
	    } else {
                reset_frame_delay();
                delete ttyrec_frames;
                current_frame = 0;
                first_cached_frame = -1;
                last_cached_frame = 0;
                n_cached_frames = 0;
                ttyrec_frames = parse_ttyrec(unescape(req.responseText));
                toggle_debug(DEBUG_INFO);
                toggle_pause_playback(PAUSE_INITIAL);
                show_current_frame();
                playback_ttyrec();
                return;
	    }
	} else {
	    toggle_pause_playback(1);
	    alert("Error: " + req.statusText);
	}
    }
}

function get_plrname(ttyrecfname)
{
    var tmp = ttyrecfname.split(/\//g);
    return tmp[6];
}

function ajax_load_ttyrec(ttyrec)
{
    create_ui();
    if (ttyrec == undefined || ttyrec == "") {
        ajax_load_random_ttyrec();
        return;
    }

    current_ttyrec = ttyrec;

    var url = NAOTERM_URL + "getttyrec.php?file="+encodeURIComponent(ttyrec);

    var btn = $("current_ttyrec_link");
    if (btn) {
        current_ttyrec = current_ttyrec.replaceAll('<','&lt;').replaceAll('&','&amp;');
        btn.innerHTML = "<a href='"+current_ttyrec+"'>"+current_ttyrec+"</a>";
    }

    if (window.XMLHttpRequest) { // Non-IE browsers
	req = new XMLHttpRequest();
	req.onreadystatechange = function () { loading_ttyrec(); };
	try {
	    req.open("GET", url, true);
	} catch (e) {
	    toggle_pause_playback(1);
	    alert(e);
	}
	req.send(null);
    } else if (window.ActiveXObject) { // IE
	req = new ActiveXObject("Microsoft.XMLHTTP");
	if (req) {
	    req.onreadystatechange = function () { loading_ttyrec(); };
	    req.open("GET", url, true);
	    req.send();
	}
    }
}

var random_ttyrec_error = 0;
function ajax_load_random_ttyrec()
{
    var url = NAOTERM_URL + "rndttyrec.php";

    if (random_ttyrec_error || !ENABLE_RND_TTYREC)
        return;

    if (window.XMLHttpRequest) { // Non-IE browsers
	req = new XMLHttpRequest();
	req.onreadystatechange = function () { loading_random_ttyrec(); };
	try {
	    req.open("GET", url, true);
	} catch (e) {
	    toggle_pause_playback(1);
            random_ttyrec_error = 1;
	    alert(e);
	}
	req.send(null);
    } else if (window.ActiveXObject) { // IE
	req = new ActiveXObject("Microsoft.XMLHTTP");
	if (req) {
	    req.onreadystatechange = function () { loading_random_ttyrec(); };
	    req.open("GET", url, true);
	    req.send();
	}
    }
}

function loading_random_ttyrec()
{
    if (req.readyState == 4) { // Complete
	if (req.status == 200) { // OK response
	    current_frame = 0;
            first_cached_frame = -1;
            last_cached_frame = -1;
            n_cached_frames = 0;
            delete ttyrec_frames;
            reset_frame_delay();
	    delete naoterminal;
	    naoterminal = new naoterm(naoterm_params);
	    toggle_pause_playback(1);
            var fname = req.responseText.trim();
            if (req.responseText == "") {
                random_ttyrec_error = 1;
                return;
            }
            var currf = (new URLSearchParams(window.location.search)).get("file");
            if (currf == "" || currf == undefined) {
                window.location.search = "?file=" + fname;
            }
	    return;
	} else {
            random_ttyrec_error = 1;
	    toggle_pause_playback(1);
	    alert("Error: " + req.statusText);
	}
    }
}
