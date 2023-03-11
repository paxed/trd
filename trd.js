
var NAOTERM_URL = "";
var DEBUG_INFO = 0;
var SPEED = { min: 20, current: 500, max: 1000, adj: 20 };
var MAX_PAUSE = 1500;

/* ******************* */

var naoterminal = new naoterm();
var current_ttyrec = -1;
var paused = 0;

/* ******************* */

var current_frame = 0;
var ttyrec_frames = new Array();

function $(e) { return document.getElementById(e); }

function show_current_frame()
{
    var frame = ttyrec_frames[current_frame];

    debugwrite("<hr>", 1);
    debugwrite("Frame #"+current_frame+": pos:"+frame.pos+",time:"+frame.time+"(delay:"+frame.delay+"),pagelen:"+frame.pagelen);

    if (naoterminal == null)
        naoterminal = new naoterm();
    naoterminal.writestr(frame.data);
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

function show_next_frame()
{
    toggle_pause_playback(1);
    current_frame++;
    show_current_frame();
}

function show_prev_frame()
{
    toggle_pause_playback(1);
    if (current_frame > 0)
        current_frame--;
    show_current_frame();
}

function play_next_frame()
{
    current_frame++;
    show_current_frame();
}

function toggle_pause_playback(state)
{
    if (state != undefined)
        paused = state;
    else
        paused = !paused;
    if (paused) {
        $("pause_button_text").innerHTML = "PAUSED";
        $("pause_button_text").classList.add('selected');
    } else {
        $("pause_button_text").innerHTML = "pause";
        $("pause_button_text").classList.remove('selected');
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

function adj_speed(adj)
{
    var s = SPEED.current + (Math.sign(adj) * SPEED.adj);
    if (s < 0 || (SPEED.min > 0 && s < SPEED.min))
        return;
    if (SPEED.max > 0 && s > SPEED.max)
        return;
    SPEED.current = s;
    btn = $("speed_display");
    if (btn)
	btn.innerHTML = SPEED.current.toString();
}

function playback_ttyrec()
{
    if (paused)
        return;

    play_next_frame();
    var frame = ttyrec_frames[current_frame];

    var delay = (frame.delay + 1) * SPEED.current;
    if (delay > MAX_PAUSE)
        delay = MAX_PAUSE;

    setTimeout(playback_ttyrec, delay);
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
        $('trd_error').style.display='none';
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

function next_frame(adj)
{
    show_next_frame();
    /*
    if (adj == undefined) adj = 1;
    if (adj > 0) {
	toggle_pause_playback(1);
	ajax_load_ttyrec(current_ttyrec);
        }
        */
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
    return ret;
}

function parse_ttyrec(data)
{
    var frames = [];
    var pos = 0;
    var datalen = data.length;
    var framenum = 0;

    while (pos < datalen) {
        var framepos = pos;
        var time = data.get_long(pos); pos += 4;
        var time_usec = data.get_long(pos); pos += 4;
        var pagelen = data.get_long(pos); pos += 4;
        var frame = data.slice(pos, pos + pagelen); pos += pagelen;

        var delay = calc_frame_delay(time);

        frames.push({ "pos": framepos, "time": time, "delay":delay, "pagelen": pagelen, "data": frame });
        framenum++;
    }
    return frames;
}

function loading_ttyrec()
{
    if (req.readyState == 4) { // Complete
	if (req.status == 200) { // OK response
	    var delay = 1;
	    var delay_usec = 0;
	    if (!naoterminal) {
		$("tty_loader_div").innerHTML = req.responseText;
	    } else {
                ttyrec_frames = parse_ttyrec(unescape(req.responseText));
                toggle_debug(DEBUG_INFO);
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
    current_ttyrec = ttyrec;

    var url = NAOTERM_URL + "getttyrec.php?file="+encodeURIComponent(ttyrec)+"&slurp=1";

    var btn = $("current_ttyrec_link");
    if (btn) btn.innerHTML = "<a href='"+current_ttyrec+"'>"+current_ttyrec+"</a>";

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

function ajax_load_random_ttyrec()
{
    var url = NAOTERM_URL + "rndttyrec.php";

    if (window.XMLHttpRequest) { // Non-IE browsers
	req = new XMLHttpRequest();
	req.onreadystatechange = function () { loading_random_ttyrec(); };
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
	    first_delay = 1;
	    starttime = 0;
	    delete naoterminal;
	    naoterminal = new naoterm();
	    toggle_pause_playback(1);
	    ajax_load_ttyrec(req.responseText);
	} else {
	    toggle_pause_playback(1);
	    alert("Error: " + req.statusText);
	}
    }
}
