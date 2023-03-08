
var NAOTERM_URL = "";

var naoterminal = null;
var current_frame = 0;
var current_ttyrec = -1;
var target_div_id = null;
var current_speed = 1000;
var paused = 0;
var timeout_handle = null;
var current_delay = 0;
var frame_time = 0;
var frame_rel_time = 0;
var first_frame_time = 0;
var max_frames = -1;

var current_ttyrec_pos = 0;

var frame_jumppoints = new Array();
var last_frame_jumppoint = 0;

function $(e) { return document.getElementById(e); }

function next_frame_loader_timer()
{
    var d = current_delay;
    if (d < 1) d = 1;
    if (d > 15) d = 15;
    timeout_handle = setTimeout(function(){ajax_load_ttyrecframe(current_ttyrec, target_div_id)}, d*current_speed);
}

function toggle_pause_playback(state)
{
    if (state != undefined) {
	paused = state;
    } else {
	paused = !paused;
    }
    var btn = $("pause_button_text");
    var str = "pause";
    if (paused) {
	if (timeout_handle != null) {
	    clearTimeout(timeout_handle);
	    timeout_handle = null;
	}
	str = "<b style='background-color:red'>paused</b>";
    } else {
	if (timeout_handle == null) {
	    next_frame_loader_timer();
	}
    }
    if (btn)
	btn.innerHTML = str;
    return false;
}

function adj_speed(adj)
{
    current_speed += adj;
    if (current_speed < 500) current_speed = 500;
    display_infos();
    if (timeout_handle != null) {
	clearTimeout(timeout_handle);
	next_frame_loader_timer();
    }
}

var toggle_show_screen_html = 0;
function show_screen_html()
{
    var btn = $("ttyscreen_html_div");
    if (!btn) return;
    toggle_pause_playback(1);
    display_infos();
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
	display_infos();
	current_ttyrec_pos = 0;
        $('trd_error').style.display='none';
	ajax_load_random_ttyrec(target_div_id);
}

function timediff(t1, t2)
{
    var diff = t2.getTime() - t1.getTime();

    var days = Math.floor(diff/1000/60/60/24);
    diff -= days*1000*60*60*24;

    var hours = Math.floor(diff/1000/60/60);
    diff -= hours*1000*60*60;

    var mins = Math.floor(diff/1000/60);
    diff -= mins*1000*60;

    var secs = Math.floor(diff/1000);

    var str = '';
    if (days > 0) str += days+" days, ";
    if (hours > 0) str += hours+"h ";
    if (mins > 0) str += mins+"m";
    str += secs+"s";
    return str;
}

function display_infos()
{
    var t = new Date(frame_time*1000);
    var r = new Date(first_frame_time*1000);

    var btn = $("frame_time_display");
    if (btn)
	btn.innerHTML = t;

    btn = $("frame_playtime_display");
    if (btn)
	btn.innerHTML = timediff(r,t);

    btn = $("frame_display");
    if (btn) {
	btn.innerHTML = current_frame.toString();
	if (max_frames > -1) btn.innerHTML += "/"+max_frames.toString();
    }

    btn = $("speed_display");
    if (btn)
	btn.innerHTML = current_speed.toString();

    btn = $("frame_delay_display");
    if (btn)
	btn.innerHTML = current_delay.toString()+"s";

    if (naoterminal) {
	btn = $("termsize_display");
	if (btn)
	    btn.innerHTML = naoterminal.SCREEN_WID.toString()+"x"+naoterminal.SCREEN_HEI.toString();
    }
}

function jumppoint_savable()
{
    if (last_frame_jumppoint < current_frame && (current_frame - last_frame_jumppoint) >= 50) {
	return 1;
    }
    return 0;
}

function set_frame_num(num)
{
    if (frame_jumppoints[num] != undefined) {
	toggle_pause_playback(1);
	current_ttyrec_pos = frame_jumppoints[num]['pos'];

	current_frame = num;
	if (frame_jumppoints[num]['term'] != undefined) {
	    delete naoterminal;
	    naoterminal = frame_jumppoints[num]['term'].clone();
	}

	ajax_load_ttyrecframe(current_ttyrec, target_div_id);
	display_infos();
    }
}

function next_frame_button(state)
{
    var btn = $("next_frame_button");
    if (btn) {
	if (state) btn.innerHTML = '<a href="#" onclick="next_frame();">&gt;</a>';
	else btn.innerHTML = '&gt;';
    }
}

function next_frame(adj)
{
    if (adj == undefined) adj = 1;
    if (adj > 0) {
	next_frame_button(0);
	toggle_pause_playback(1);
	current_delay = 1;
	display_infos();
	ajax_load_ttyrecframe(current_ttyrec, target_div_id);
    }
}

var first_delay = 1;
var starttime = 0;
var first_time = 0;

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



function add_frame_jumppoint(framenum, pos, save_term)
{
    var d = $("clrscr_frames");
    if (!d) return;

    if (frame_jumppoints[framenum] == undefined) {

	if (save_term == undefined) save_term = 0;

	var str = naoterminal.get_str(0,0, naoterminal.hi_x-1).trim();
	if (str.length < 1) {
	    str = naoterminal.get_str(0,naoterminal.hi_y-1, naoterminal.hi_x-1).trim();
	}
	if (str.length < 1) {
	    str = naoterminal.get_str(0,naoterminal.hi_y-2, naoterminal.hi_x-1).trim();
	}

	if (str.length < 1) str = "Unnamed Frame #"+framenum;

	str = framenum+") "+str;

	var dlink = undefined;

	if (!save_term && naoterminal.had_clrscr) {
	    dlink = ' [<a href="'+NAOTERM_URL+'?file='+encodeURIComponent(current_ttyrec)+'&pos='+pos+'">direct&nbsp;link</a>]'
	}

	if (last_frame_jumppoint < framenum) last_frame_jumppoint = framenum;

	d.innerHTML += "<a href='#' onclick='set_frame_num("+framenum+");'>"+str+"</a>";
	if (dlink) d.innerHTML += dlink;
	d.innerHTML += "<br>";
	frame_jumppoints[framenum] = {'name':str, 'pos':pos};
	if (save_term)
	    frame_jumppoints[framenum]['term'] = naoterminal.clone();
    }
}

function loading_ttyrecframe(target)
{
    if (req.readyState == 4) { // Complete
	if (req.status == 200) { // OK response
	    var delay = 1;
	    var delay_usec = 0;
	    if (!naoterminal) {
		$(target).innerHTML = req.responseText;
	    } else {

		debugwrite("<hr>", 1);

		frame_time = 0;
		frame_rel_time = 0;
		var l = unescape(req.responseText);
		var prev_pos = current_ttyrec_pos;

		if (l.length <= 0) {
		    max_frames = current_frame;
		    toggle_pause_playback(1);
		    display_infos();
		    return;
		}

		//debugwrite(l);

		current_ttyrec_pos += l.length;

		delay = l.get_long(0);
		delay_usec = l.get_long(4);
		var pagelen = l.get_long(8);
		delay_timetest = new Date(delay);

		if (first_delay) {
		    starttime = delay;
		    frame_time = delay;
		    first_frame_time = delay;
		    delay = 1;
		    first_delay = 0;
		    /*frame_time = 0;*/
		} else {
		    frame_time = delay; /* - first_time);*/
		    var tmp = delay;
		    delay = (delay - starttime);
		    frame_rel_time += delay;
		    starttime = tmp;
		}
		debugwrite('Frame length: '+l.length);
		l = l.substring(12);
		//debugwrite(l+'<hr>');
		naoterminal.writestr(l);

		if (current_frame == 0 || naoterminal.had_clrscr || jumppoint_savable())
		    add_frame_jumppoint(current_frame, prev_pos, jumppoint_savable());

		current_frame++;
		show_debug_info();
		$(target).innerHTML = naoterminal.get_html();
	    }
	    next_frame_button(1);
	    display_infos();

	    if (paused) return;
	    if (delay != undefined) {
		current_delay = delay;
		target_div_id = target;
		display_infos();
		next_frame_loader_timer();
	    }
	} else {
	    toggle_pause_playback(1);
	    display_infos();
	    alert("Error: " + req.statusText);
	}
    }
}

function get_plrname(ttyrecfname)
{
    var tmp = ttyrecfname.split(/\//g);
    return tmp[6];
}

function ajax_load_ttyrecframe(ttyrec, target, pos)
{
    current_ttyrec = ttyrec;

    if (pos != undefined) {
	current_ttyrec_pos = pos;
    }

    var url = NAOTERM_URL + "getttyrec.php?file="+encodeURIComponent(ttyrec)+"&pos="+current_ttyrec_pos; 

    var btn = $("current_ttyrec_link");
    if (btn) btn.innerHTML = "<a href='"+current_ttyrec+"'>"+current_ttyrec+"</a>";
/*
    var plr = get_plrname(current_ttyrec);
    $('current_player_ttyrecs').innerHTML = '<a href="../browsettyrec.php?player=' + plr + '">Browse other TTYRECs by ' + plr + '</a>';
*/
    target_div_id = target;

    if (window.XMLHttpRequest) { // Non-IE browsers
	req = new XMLHttpRequest();
	req.onreadystatechange = function () { loading_ttyrecframe(target); };
	try {
	    req.open("GET", url, true);
	} catch (e) {
	    toggle_pause_playback(1);
	    display_infos();
	    alert(e);
	}
	req.send(null);
    } else if (window.ActiveXObject) { // IE
	req = new ActiveXObject("Microsoft.XMLHTTP");
	if (req) {
	    req.onreadystatechange = function () { loading_ttyrecframe(target); };
	    req.open("GET", url, true);
	    req.send();
	}
    }
}

function ajax_load_random_ttyrec(target)
{
    var url = NAOTERM_URL + "rndttyrec.php";

    target_div_id = target;

    if (window.XMLHttpRequest) { // Non-IE browsers
	req = new XMLHttpRequest();
	req.onreadystatechange = function () { loading_random_ttyrecframe(target); };
	try {
	    req.open("GET", url, true);
	} catch (e) {
	    toggle_pause_playback(1);
	    display_infos();
	    alert(e);
	}
	req.send(null);
    } else if (window.ActiveXObject) { // IE
	req = new ActiveXObject("Microsoft.XMLHTTP");
	if (req) {
	    req.onreadystatechange = function () { loading_random_ttyrecframe(target); };
	    req.open("GET", url, true);
	    req.send();
	}
    }
}

function loading_random_ttyrecframe(target)
{
    if (req.readyState == 4) { // Complete
	if (req.status == 200) { // OK response
	    current_frame = 0;
	    current_delay = 1;
	    frame_time = 0;
	    frame_rel_time = 0;
	    first_frame_time = 0;
	    max_frames = -1;
	    current_ttyrec_pos = 0;
	    last_frame_jumppoint = 0;
	    delete frame_jumppoints;
	    frame_jumppoints = new Array();
	    var d = $("clrscr_frames");
	    if (d) d.innerHTML = '';
	    first_delay = 1;
	    starttime = 0;
	    first_time = 0;
	    delete naoterminal;
	    naoterminal = new naoterm();
	    toggle_pause_playback(1);
	    ajax_load_ttyrecframe(req.responseText, target);
	} else {
	    toggle_pause_playback(1);
	    display_infos();
	    alert("Error: " + req.statusText);
	}
    }
}
