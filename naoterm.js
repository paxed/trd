
var show_debugging_info = 1;
var debugging_string = '';

function debugwrite(str, clear)
{
    if (!show_debugging_info) return;
    if (clear)
	debugging_string = str;
    else
	debugging_string += '<br>'+str;
}

function show_debug_info()
{
    if (!show_debugging_info) return;
    var x = document.getElementById("debugdiv");
    if (x) {
	x.innerHTML = debugging_string;
    }
}


function debugobj(obj)
{
    if (!show_debugging_info) return;
    var output = '<b>';
    for (property in obj) {
	output += property + ': ' + obj[property]+'; ';
    }
    output += '</b>';
    debugwrite(output);
}

String.prototype.toDebugString = function() {
    return this;
    var s = this+" [";
    for (var i = 0; i < this.length; i++) {
	var c = this.charAt(i);
	var cc = this.charCodeAt(i);
	s += "{'"+c+"', "+cc+"}";
	if (i+1 < this.length) s+= ", ";
    }
    s+= "]";
    return s;
}

function toggle_debug()
{
    show_debugging_info = !show_debugging_info;
    var x = document.getElementById("debugdiv");
    if (x) x.innerHTML = '';
    var x = document.getElementById("debug_button");
    if (x) x.style.fontWeight=(show_debugging_info ? 'bold' : 'normal');
}


function is_array(input){
    return typeof(input)=='object'&&(input instanceof Array);
}
/*
String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g,"");
}
String.prototype.ltrim = function() {
    return this.replace(/^\s+/,"");
}
String.prototype.rtrim = function() {
    return this.replace(/\s+$/,"");
}
*/


/*
 naoterm, by paxed@alt.org
 a javascript vt100 (or thereabouts) terminal emulation,
 mainly meant for replaying nethack TTYRECs.
*/


function naoterm(wid, hei)
{
  this.SCREEN_WID = ((wid == undefined) ? 80 : wid);
  this.SCREEN_HEI = ((hei == undefined) ? 24 : hei);

  this.screen;
  this.prevdata = undefined;

  this.hidden_cursor = 0;

  this.cursor_x = 0;
  this.cursor_y = 0;

  this.saved_cursor_x = 0;
  this.saved_cursor_y = 0;
  this.saved_attr = 0;
  this.saved_color = 7;
  this.saved_bgcolor = 0;

  this.attr = 0;
  this.color = 7;
  this.bgcolor = 0;

  this.def_color = 7;
  this.def_bgcolor = 0;

  this.hi_x = this.SCREEN_WID;
  this.hi_y = this.SCREEN_HEI;

  this.scroll_lines = [ 0, this.SCREEN_HEI - 1 ];

  this.screen = new Array(this.hi_x * this.hi_y);

  this.use_alt_charset = 0;
  this.had_clrscr = 0;
  this.utf8 = 0;

  /* missing some chars */
    this.deccharset = {'`':'{', 'a':'&#x2592;', 'j':'-', 'k':'-', 'l':'-', 'm':'-', 'n':'-', 'q':'-', 't':'|', 'u':'|', 'v':'-', 'w':'-', 'x':'|', '~':'.'};

  this.ibmcharset = {
      '176':'&#x2591;',
      '177':'&#x2592;',
      '179':'&#x2502;',
      '180':'&#x2524;',
      '191':'&#x2510;',
      '192':'&#x2514;',
      '193':'&#x2534;',
      '194':'&#x252c;',
      '195':'&#x251c;',
      '196':'&#x2500;',
      '197':'&#x253c;',
      '217':'&#x2518;',
      '218':'&#x250c;',
      '250':'.',
      '254':'&#x2a05;' /* door symbol... */
};
  /*
  this.ibmcharset = new Array({176+'':'#', 179+'':'|', 180+'':'|', 191+'':'-', 192+'':'-', 193+'':'-', 194+'':'-', 195+'':'|'},
		  {196+'':'-', 197+'':'-', 217+'':'-', 218+'':'-'},{247+'':'{', 250+'':'.', 254+'':'.'},

		  {200+'':'-', 201+'':'-'},{205+'':'-', 206+'':'.', 187+'':'-', 188+'':'-', 177+'':'#', 186+'':'|'});
  */
    /* decgraphics */
  this.alt_charset2 = {'q' : "&#x2500;",
		       'l' : "&#x250c;",
		       'x' : "&#x2502;",
		       'm' : "&#x2514;",
		       'j' : "&#x2518;",
		       'k' : "&#x2510;",
		       '~' : ".",
		       'a' : '&#x2592;',

		       'o' : '&#x2500;',
		       's' : '&#x2500;',

		       'w' : '&#x252c;',
		       'v' : '&#x2534;',
		       'u' : '&#x2524;',
		       't' : '&#x251c;',

		       'n' : '&#x253c;'}; /* crosswall */


  this.get_idx = function(x,y) { return y*(this.SCREEN_WID+1) + x; }

    this.scroll_screen_down = function(numlines)
    {
        var a = this.scroll_lines[0];
        var b = this.scroll_lines[1];

        debugwrite("scroll_screen_down("+numlines+")");
        while (numlines > 0) {
            numlines--;
            for (var y = b - 1; y >= a; y--) {
                for (var x = 0; x < this.SCREEN_WID; x++) {
                    var tmp = this.get_data(x, y);
                    this.set_data(x, y+1, tmp);
                }
            }
            for (var x = 0; x < this.SCREEN_WID; x++) {
                this.clrcell(x, a);
            }
        }
    }

    this.scroll_screen = function(numlines)
    {
        if (numlines < 0) {
            this.scroll_screen_down(-numlines);
            return;
        }

        var a = this.scroll_lines[0];
        var b = this.scroll_lines[1];

        debugwrite("scroll_screen("+numlines+")");
        while (numlines > 0) {
            numlines--;
            for (var y = a + 1; y <= b; y++) {
                for (var x = 0; x < this.SCREEN_WID; x++) {
                    var tmp = this.get_data(x, y);
                    this.set_data(x, y-1, tmp);
                }
            }
            for (var x = 0; x < this.SCREEN_WID; x++) {
                this.clrcell(x, b);
            }
        }
    }

  this.savecursor = function()
      {
	  this.saved_cursor_x = this.cursor_x;
	  this.saved_cursor_y = this.cursor_y;
          this.saved_attr = this.attr;
          this.saved_color = this.color;
          this.saved_bgcolor = this.bgcolor;
      }

  this.restorecursor = function()
      {
	  this.cursor_x = this.saved_cursor_x;
	  this.cursor_y = this.saved_cursor_y;
          this.attr = this.saved_attr;
          this.color = this.saved_color;
          this.bgcolor = this.saved_bgcolor;
      }

  this.clear = function()
      {
	  delete this.screen;
	  this.screen = new Array(this.SCREEN_WID * this.SCREEN_HEI);

	  debugwrite("clear()");
      }

  this.clearline = function()
      {
	  for (var x = 0; x < this.SCREEN_WID; x++) {
	      delete this.screen[this.get_idx(x, this.cursor_y)];
	  }
	  debugwrite("clearline()");
      }

  this.clear2eol = function()
      {
	  for (var x = this.cursor_x; x < this.SCREEN_WID; x++) {
	      delete this.screen[this.get_idx(x, this.cursor_y)];
	  }
	  debugwrite("clear2eol()");
      }

  this.clear2bol = function()
      {
	  for (var x = this.cursor_x; x >= 0; x--) {
	      delete this.screen[this.get_idx(x, this.cursor_y)];
	  }
	  debugwrite("clear2bol()");
      }

  this.cleardown = function()
      {
	  for (var y = this.cursor_y; y < this.SCREEN_HEI; y++) {
	      for (var x = 0; x < this.SCREEN_WID; x++) {
		  delete this.screen[this.get_idx(x, y)];
	      }
	  }
	  debugwrite("cleardown()");
      }

  this.clearup = function()
      {
	  for (var y = this.cursor_y; y >= 0; y--) {
	      for (var x = 0; x < this.SCREEN_WID; x++) {
		  delete this.screen[this.get_idx(x, y)];
	      }
	  }
	  debugwrite("clearup()");
      }

  this.get_str = function(x,y,len)
      {
	  var strret = '';
	  for (i = 0; i < len; i++) {
	      var cell = this.get_data(x+i, y);
	      if (cell != undefined && cell['char'] != undefined) {
		  var c = cell['char'];
		  if (x >= ' ' && c <= '~') strret += c;
		  else strret += ' ';
	      } else strret += ' ';
	  }
	  return strret;
      }

  this.get_html = function()
      {
	  var maxx = this.hi_x;
	  var maxy = this.hi_y;

	  var sret = "<div class='ttyscreen'>";
	  var y = 0;
	  while (y < maxy) {
	      var x = 0;
              sret += "<span class='ttyrow'>";
	      while (x < maxx) {
		  var dat = this.getcellspan(x,y, maxx);
		  sret += dat['span'];
		  x = parseInt(dat.x);
	      }
	      sret += "</span>";
	      y++;
	  }
	  sret += "</div>";
	  return sret;
      }

  this.get_wiki = function()
      {
	  var maxx = this.hi_x;
	  var maxy = this.hi_y;

	  var sret = "<div class='ttyscreen'>";
	  var y = 0;
	  while (y < maxy) {
	      var x = 0;
	      while (x < maxx) {
		  var dat = this.getcellspan_wiki(x,y, maxx);
		  sret += dat['span'];
		  x = parseInt(dat.x);
	      }
	      y++;
	      if (y < maxy) sret += "<br>\n";
	  }
	  sret += "</div>";
	  return sret;
      }


  this.clrcell = function(x,y)
      {
	  delete this.screen[this.get_idx(x,y)];
      }

  this.set_data = function(x,y,data)
      {
	  var idx = this.get_idx(x,y);
	  if (this.screen[idx] != undefined) { delete this.screen[idx]; }
	  this.screen[idx] = data;
	  /*
	  this.screen[idx] = eval(data.toSource());
	  */
	  /*
	  this.screen[idx] = new Array();
	  this.screen[idx]['color'] = data['color'];
	  this.screen[idx]['bgcolor'] = data['bgcolor'];
	  this.screen[idx]['attr'] = data['attr'];
	  this.screen[idx]['char'] = data['char'];
	  */
	  //	  this.screen[idx] = {'color': data['color'], 'bgcolor': data['bgcolor'], 'attr': data['attr'], 'char': data['char']};
      }

  this.get_data = function(x,y)
      {
	  return this.screen[this.get_idx(x,y)];
      }

  this.clone = function()
      {
	  debugwrite("clone()");
          return Object.assign({}, this);
      }

  this.resize = function(wid,hei)
      {
	  if (wid <= this.SCREEN_WID && hei <= this.SCREEN_HEI) return;
	  debugwrite("resize("+wid+","+hei+")");
	  var tmppanel = this.clone();
	  var x,y;

	  if (wid > this.SCREEN_WID) wid += 10;
	  if (hei > this.SCREEN_HEI) hei += 2;

	  this.SCREEN_WID = wid;
	  this.SCREEN_HEI = hei;

	  delete this.screen;
	  this.screen = new Array(wid * hei);

	  for (y = 0; y < Math.min(this.SCREEN_HEI, tmppanel.SCREEN_HEI); y++) {
	      for (x = 0; x < Math.min(this.SCREEN_WID, tmppanel.SCREEN_WID); x++) {
		  var dat = tmppanel.get_data(x,y);
		  if (dat != undefined) this.set_data(x,y, dat);
	      }
	  }

	  delete tmppanel;
      }

  this.putchar = function(chr)
      {
	  if (this.SCREEN_WID < (this.cursor_x+1) || this.SCREEN_HEI < (this.cursor_y+1)) {
	      this.resize(Math.max(this.SCREEN_WID, this.cursor_x+1),
			  Math.max(this.SCREEN_HEI, this.cursor_y+1));
	  }
	  var o = chr.charCodeAt(0);
	  //debugwrite("putchar('"+chr+"') [code:"+o+"]");
	  if (o >= 32) {
	      var c = ' ';

	      if (this.use_alt_charset == 2) {
		  if (this.alt_charset2[chr] != undefined) c = this.alt_charset2[chr];
		  else c = chr;
	      } else {
		  if (this.use_alt_charset && (this.deccharset[chr] != undefined)) {
		      c = this.deccharset[chr];
		  } else if (this.ibmcharset[o.toString()] != undefined) {
		      c = this.ibmcharset[o.toString()];
		  } else {
		      c = chr;
		  }
	      }

              if (c == '<')
                  c = '&lt;';
              else if (c == '&')
                  c = '&amp;';

	      var tmpdata = {'color': this.color, 'bgcolor':this.bgcolor, 'attr':this.attr, 'char':c};
	      this.set_data(this.cursor_x, this.cursor_y, tmpdata);
	      this.movecursorpos(1, 0, false);
	  } else if (o == 15) {
	      this.use_alt_charset = 0;
	  } else if (o == 14) {
	      this.use_alt_charset = 1;
	  } else if (o == 13) {
	      this.cursor_x = 0;
	  } else if (o == 10) {
	      this.movecursorpos(0, 1);
	  } else if (o == 9) {
              debugwrite("putchar(TAB)");
              this.movecursorpos(1, 0);
              this.movecursorpos((this.cursor_x % 9), 0);
	  } else if (o == 8) {
              debugwrite("putchar(BACKSPACE)");
	      if (this.cursor_x > 0) this.movecursorpos(-1, 0);
	  } else {
              debugwrite("<b>UNHANDLED putchar("+chr+")</b>");
          }

	  if (this.hi_x <= this.cursor_x) this.hi_x = this.cursor_x+1;
	  if (this.hi_y <= this.cursor_y) this.hi_y = this.cursor_y+1;
      }


  this.putstr = function(str)
      {
	  for (var i = 0; i < str.length; i++) {
	      this.putchar(str.charAt(i));
	  }
      }

  this.setcursorpos = function(x,y)
      {
          if (x >= this.SCREEN_WID || y >= this.SCREEN_HEI) {
              debugwrite("setcursorpos: Out of screen");
	      this.resize(Math.max(this.SCREEN_WID, x+1),
			  Math.max(this.SCREEN_HEI, y+1));
          }
	  this.cursor_x = (x < 0) ? 0 : x;
	  this.cursor_y = (y < 0) ? 0 : y;
	  debugwrite("setcursorpos("+x+","+y+")");
      }

    this.movecursorpos = function(x,y, nodebug)
    {
        /*
          if ((this.cursor_x + x) >= this.SCREEN_WID || (this.cursor_y + y) >= this.SCREEN_HEI) {
              debugwrite("movecursorpos: Out of screen");
	      this.resize(Math.max(this.SCREEN_WID, this.cursor_x+x+1),
			  Math.max(this.SCREEN_HEI, this.cursor_y+y+1));
                          }
                          */
	  this.cursor_x += x;
	  if (this.cursor_x < 0) this.cursor_x = 0;
	  this.cursor_y += y;
	  if (this.cursor_y < 0) this.cursor_y = 0;
          if (nodebug == undefined)
	      debugwrite("movecursorpos("+x+","+y+")");
        if (y == 1 && this.cursor_y > this.scroll_lines[1]) {
            this.scroll_screen(1);
            this.cursor_y--;
        }
      }

  this.setattr = function(attr)
      {
          var unhandled = 0;
	  if (!Array.isArray(attr)) attr = new Array(attr);
	  for (var tmpidx = 0; tmpidx < attr.length; tmpidx++) {
	      var a = parseInt(attr[tmpidx]);
              if (a == 0 || attr[tmpidx] == undefined || attr[tmpidx] == "") {
                  this.attr = 0; this.color = this.def_color; this.bgcolor = this.def_bgcolor;
              } else if ((a >= 0) && (a <= 11)) {
                  switch (a) {
                  case 1: this.attr |= 1; break; /* bold */
		  case 2: this.attr |= 2; break; /* half-bright/dim */
                  case 3: this.attr |= 64; break; /* italic */
		  case 4: this.attr |= 4; break; /* underscore/underlined */
		  case 5: this.attr |= 8; break; /* blink */
		  case 7: this.attr |= 16; break; /* inverse/reverse video */
		  case 8: this.attr |= 32; break; /* invisible/hidden */
                  case 9: this.attr |= 128; break; /* strikethrough/crossed-out chars*/
		  case 10: this.use_alt_charset = 0; break;
		  case 11: this.use_alt_charset = 2; break;
                  default:
                      unhandled = 1;
                  }
	      } else if ((a >= 20) && (a <= 29)) {
                  switch (a-20) {
                  case 1: this.attr &= ~1; break; /* bold */
		  case 2: this.attr &= ~2; break; /* half-bright/dim */
                  case 3: this.attr &= ~64; break; /* italic */
		  case 4: this.attr &= ~4; break; /* underscore/underlined */
		  case 5: this.attr &= ~8; break; /* blink */
		  case 7: this.attr &= ~16; break; /* inverse/reverse video */
		  case 8: this.attr &= ~32; break; /* invisible/hidden */
                  case 9: this.attr &= ~128; break; /* strikethrough/crossed-out chars*/
                  default:
                      unhandled = 1;
                  }
	      } else if ((a >= 30) && (a <= 37)) this.color = a-30;
              else if (a == 38) {
                  /* Set fg color: CSI 38 ; 5 ; <color_index> m */
                  if (tmpidx+2 < attr.length && attr[tmpidx+1] == 5) {
                      this.color = parseInt(attr[tmpidx+2]);
                      break;
                  } else {
                      unhandled = 1;
                  }
              }
              else if (a == 39) { this.color = this.def_color; this.attr &= ~1; }
	      else if ((a >= 40) && (a <= 47)) this.bgcolor = a-40;
              else if (a == 48) {
                  /* Set bg color: CSI 48 ; 5 ; <color_index> m */
                  if (tmpidx+2 < attr.length && attr[tmpidx+1] == 5) {
                      this.bgcolor = parseInt(attr[tmpidx+2]);
                      break;
                  } else {
                      unhandled = 1;
                  }
              }
              else if (a == 49) { this.bgcolor = this.def_bgcolor; this.attr &= ~1; }
              else if ((a >= 90) && (a <= 97)) { this.color = a-90; this.attr |= 1; }
              else if ((a >= 100) && (a <= 107)) { this.bgcolor = a-100; this.attr |= 1; }
              else {
                  unhandled = 1;
              }
              if (unhandled)
                  debugwrite("<b>UNHANDLED setattr(" + a + ")</b>");
	  }
          if (!unhandled)
              debugwrite("setattr("+attr.join(";")+")");
      }

  this.getcellstyle_wiki = function(x,y)
  {
      var colornames = new Array("black", "red", "green", "brown", "blue", "magenta", "cyan", "lightgray",
				 "darkgray", "orange", "brightgreen", "yellow", "brightblue", "brightmagenta", "brightcyan", "white");
      var style = 0;
      var cell = this.get_data(x,y);
      if (cell != undefined) {
	  style = (cell['color'] + ((cell['attr'] & 1) * 8));
      }
      return colornames[style];
  }

  this.getcellspan_wiki = function(x,y,maxx)
      {
	  var prevstyle = this.getcellstyle_wiki(x,y);
	  var style = prevstyle;
	  var chars = '';
	  var showchars = (prevstyle == '') ? 1 : 0;
	  while ((x < maxx) && (style == prevstyle)) {
	      style = this.getcellstyle_wiki(x,y);
	      if (style == prevstyle) {
		  var cell = this.get_data(x,y);
		  x++;
		  if (cell != undefined && cell['char'] != undefined) {
		      var c = cell['char'];
		      if (c == '|') c = '&amp;#124;';
		      else if (c == '}') c = '&amp;#125;';
		      else if (c == ' ') c = '&amp;nbsp;';
		      else if (c == '"') c = '&amp;quot;';
		      else if (c == '\'') c = '&amp;#39;';
		      else if (c == '>') c = '&amp;gt;';
		      else if (c == '<') c = '&amp;lt;';
		      else if (c == '=') c = '&#61;';
		      chars += c;
		  } else chars += '&amp;nbsp;';
	      }
	  }

	  if (prevstyle && (!showchars)) span = '{{'+prevstyle+'|'+chars+'}}';
	  else span = '{{lightgray|'+chars+'}}';
	  var ret = new Array();
	  ret['span'] = span;
	  ret['x'] = x;
	  return ret;
      }

  this.getcellstyle = function(x,y)
      {
	  var style = '';
	  var cell = this.get_data(x,y);
	  if (!this.hidden_cursor && (this.cursor_x == x) && (this.cursor_y == y)) style = 'cur';

	  if (cell != undefined) {

	      var bright = 0;
	      /*var reverse = 0;*/

	      var bg = cell['bgcolor'];
	      var fg = cell['color'];
	      var atr = cell['attr'];
	      var chr = cell['char'];

	      if (atr != undefined) {
		  if (atr & 1) bright = 1;
		  //if (atr & 2) /* dim */;
		  if (atr & 4) style += ' ul';
		  if (atr & 8) style += ' bl';
		  if (atr & 16) { /*reverse = 1;*/ var tmp = bg; bg = fg; fg = tmp; }
		  //if (atr & 32) /* hidden */;
                  if (atr & 64) style += ' it'; /* italic */
                  if (atr & 128) style += ' st'; /* strikethrough */
	      }
	      /*
	      if (reverse) {
		  var tmp = bg; bg = fg; fg = tmp;
	      }
	      */
	      if (!((chr == ' ') && (style != ''))) {
		  if (bg != undefined && bg != this.def_bgcolor)
		      style += ' b'+bg;
		  if (fg != undefined && (fg + bright*8) != this.def_color)
		      style += ' f'+(fg + bright*8);
	      }
	  }
	  return style;
      }


  this.getcellspan = function(x,y,maxx)
      {
	  //debugwrite("getcellspan("+x+","+y+","+maxx+")");
	  var prevstyle = this.getcellstyle(x,y);
	  var style = prevstyle;
	  var chars = '';
	  var showchars = (prevstyle == '') ? 1 : 0;
	  while ((x < maxx) && (style == prevstyle)) {
	      style = this.getcellstyle(x,y);
	      if (style == prevstyle) {
		  var cell = this.get_data(x,y);
		  x++;
		  if (cell != undefined && cell['char'] != undefined) {
		      if (cell['char'] != ' ') showchars = 0;
		      chars += cell['char'];
		  } else chars += ' ';
	      }
	  }

	  if (prevstyle && (!showchars)) span = '<span class="'+prevstyle+'">'+chars+'</span>';
	  else span = chars;
	  var ret = new Array();
	  ret['span'] = span;
	  ret['x'] = x;
	  return ret;
      }


  this.switch_charset = function(code, param)
      {
	  if (code == '(') {
	      switch (param) {
		  default: debugwrite('<b>UNSUPPORTED switch charset: "'+param+'"</b>');
		  break;
		  case '0': this.use_alt_charset = 2; break;
		  case 'B': this.use_alt_charset = 0; break;
	      }
	  }
	  debugwrite("switch_charset("+code+","+param+")");
      }

  this.handle_dec_set_reset = function(reset, param) /* DECSET/DECRST */
    {
        var unhandled = 0;
	  var i = parseInt(param);
	  switch (i) {
	  default: unhandled = 1;
	      break;
	  case 1: break; /* ignore, we don't care what cursor keys send */
	  case 2: break; /* ANSI/vt52 mode */
	  case 3: break; /* ignore, 80/132 column mode switch */
	  case 4: break; /* jump(=fast) scrolling */
          case 7: break; /* no auto-wrap mode (DECAWM) */
	  case 8: break; /* ignore, keyboard autorepeat */
	  case 9: break; /* ignore, X11 mouse reporting */
          case 12: break; /* ignore, stop blinking cursor */
	  case 25: this.hidden_cursor = !reset; break;
	  case 40: break; /* allow 132 cols */
	  case 45: break; /* enable reverse wraparound */
	  case 47: break; /* TODO: switch to alternate buffer? */
	  case 1000: break;
          case 1034: break; /* Don't interpret "meta" key */
	  case 1047: break; /* TODO: switch to alternate screen & clear it. should handle this? */
          case 1049: break; /* use normal screen buffer & restore cursor (like DECRC) */
	  case 1051: break; /* ignore. SUN function keys */
	  case 1052: break; /* ignore. HP function keys */
	  case 1060: break; /* ignore. xterm function keys */
	  case 1061: break; /* ignore. vt220 function keys */
          case 2004: break; /* ignore. bracketed paste mode. */
		  /* should possibly handle:
		     "ESC [ ? 5 h"  (reverse mode)
		     "ESC [ ? 6 h"  (relative cursor)
		     "ESC [ ? 7 h"  (autowrap) */
		  //break;
	  }
        var str = "handle_dec_set_reset("+reset+","+param+")";
        if (unhandled)
            str = "<b>UNHANDLED " + str + "</b>";
        debugwrite(str);
      }

    // Taken from https://mths.be/punycode
    this.ucs2decode = function(string) {
	var output = [];
	var counter = 0;
	var length = string.length;
	var value;
	var extra;
	while (counter < length) {
	    value = string.charCodeAt(counter++);
	    if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
		// high surrogate, and there is a next character
		extra = string.charCodeAt(counter++);
		if ((extra & 0xFC00) == 0xDC00) { // low surrogate
		    output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
		} else {
		    // unmatched surrogate; only append this code unit, in case the next
		    // code unit is the high surrogate of a surrogate pair
		    output.push(value);
		    counter--;
		}
	    } else {
		output.push(value);
	    }
	}
	return output;
    }

    // Taken from https://mths.be/punycode
    this.ucs2encode = function(array) {
	var length = array.length;
	var index = -1;
	var value;
	var output = '';
	while (++index < length) {
	    value = array[index];
	    if (value > 0xFFFF) {
		value -= 0x10000;
		output += String.fromCharCode(value >>> 10 & 0x3FF | 0xD800);
		value = 0xDC00 | value & 0x3FF;
	    }
	    output += String.fromCharCode(value);
	}
	return output;
    }

    /* taken from https://github.com/mathiasbynens/utf8.js/ */
    this.readContinuationByte = function() {
	if (this.byteIndex >= this.byteCount) {
	    throw Error('Invalid byte index');
	}

	var continuationByte = this.byteArray[this.byteIndex] & 0xFF;
	this.byteIndex++;

	if ((continuationByte & 0xC0) == 0x80) {
	    return continuationByte & 0x3F;
	}

	// If we end up here, it’s not a continuation byte
	throw Error('Invalid continuation byte');
    }

    /* taken from https://github.com/mathiasbynens/utf8.js/ */
    this.checkScalarValue = function(codePoint) {
	if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
	    throw Error(
		'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
		    ' is not a scalar value'
	    );
	}
    }

    /* taken from https://github.com/mathiasbynens/utf8.js/ */
    this.decodeSymbol = function() {
	var byte1;
	var byte2;
	var byte3;
	var byte4;
	var codePoint;

	if (this.byteIndex > this.byteCount) {
	    throw Error('Invalid byte index');
	}

	if (this.byteIndex == this.byteCount) {
	    return false;
	}

	// Read first byte
	byte1 = this.byteArray[this.byteIndex] & 0xFF;
	this.byteIndex++;

	// 1-byte sequence (no continuation bytes)
	if ((byte1 & 0x80) == 0) {
	    return byte1;
	}

	// 2-byte sequence
	if ((byte1 & 0xE0) == 0xC0) {
	    byte2 = this.readContinuationByte();
	    codePoint = ((byte1 & 0x1F) << 6) | byte2;
	    if (codePoint >= 0x80) {
		return codePoint;
	    } else {
		throw Error('Invalid continuation byte');
	    }
	}

	// 3-byte sequence (may include unpaired surrogates)
	if ((byte1 & 0xF0) == 0xE0) {
	    byte2 = this.readContinuationByte();
	    byte3 = this.readContinuationByte();
	    codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
	    if (codePoint >= 0x0800) {
		this.checkScalarValue(codePoint);
		return codePoint;
	    } else {
		throw Error('Invalid continuation byte');
	    }
	}

	// 4-byte sequence
	if ((byte1 & 0xF8) == 0xF0) {
	    byte2 = this.readContinuationByte();
	    byte3 = this.readContinuationByte();
	    byte4 = this.readContinuationByte();
	    codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
		(byte3 << 0x06) | byte4;
	    if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
		return codePoint;
	    }
	}

	throw Error('Invalid UTF-8 detected');
    }

    /* taken from https://github.com/mathiasbynens/utf8.js/ */
    this.utf8decode = function(byteString)
    {
        this.byteArray = this.ucs2decode(byteString);
	this.byteCount = this.byteArray.length;
	this.byteIndex = 0;
	var codePoints = [];
	var tmp;
	while ((tmp = this.decodeSymbol()) !== false) {
	    codePoints.push(tmp);
	}
	return this.ucs2encode(codePoints);
    }


  this.doescapecode = function(code, param)
      {
	  debugwrite("doescapecode("+code.toDebugString()+","+param.toDebugString()+")");
	  switch (code) {
	      default:
	      debugwrite("<b>UNHANDLED ESCAPE CODE</b>: (code:"+code.toDebugString()+", param:"+param.toDebugString()+")");
		  break;
	      case 'J': /* erase screen */
		  if ((param == '2') || (param == '3')) { /* whole screen */
		      this.clear();
		      this.had_clrscr = 1;
		      this.setcursorpos(0,0);
		  } else if (param == '1') { /* erase from cursor up */
		      this.clearup();
		  } else if ((param == '') || (param == '0') || (param == undefined)) { /* erase from cursor down */
		      if (this.cursor_y == 0) this.had_clrscr = 1;
		      this.cleardown();
		  } else {
		      debugobj(param);
		  }
		  break;
	      case 'K': /* erase line */
		  if ((param == '') || (param == undefined)) { /* erase to eol */
		      this.clear2eol();
		  } else if (param == '1') {
		      this.clear2bol();
		  } else if (param == '2') {
		      this.clearline();
		  } else {
		      debugobj(param);
		  }
		  break;
	      case 'f':
	      case 'H': /* cursor position */
		  var coord = param.split(";");
		  if (param == undefined || isNaN(coord[0]) || coord[0] == undefined || coord[1] == undefined) {
		      this.setcursorpos(0, 0);
		  } else {
		      this.setcursorpos(parseInt(coord[1])-1, parseInt(coord[0])-1);
		  }
		  break;
	  case '@': /* insert blank chars */
		  var amount = parseInt(param);
		  if (isNaN(amount) || amount < 1) amount = 1;
		  while (amount > 0) {
		      amount--;
		      this.putchar(" ");
		  }
		  break;
	      case 'A': /* move cursor up */
		  var amount = parseInt(param);
		  if (isNaN(amount) || amount < 1) amount = 1;
		  this.movecursorpos(0, -amount);
	          //debugwrite("movecursorpos(0, -"+amount+")");
		  break;
	      case 'B': /* cursor down */
		  var amount = parseInt(param);
		  if (isNaN(amount) || amount < 1) amount = 1;
		  this.movecursorpos(0, amount);
	          //debugwrite("movecursorpos(0, "+amount+")");
		  break;
	      case 'C': /* cursor forward */
		  var amount = parseInt(param);
		  if (isNaN(amount) || amount < 1) amount = 1;
		  this.movecursorpos(amount, 0);
	          //debugwrite("movecursorpos("+amount+", 0)");
		  break;
	      case 'D': /* cursor backward */
		  var amount = parseInt(param);
		  if (isNaN(amount) || amount < 1) amount = 1;
		  this.movecursorpos(-amount, 0);
	          //debugwrite("movecursorpos(-"+amount+", 0)");
		  break;
	  case 'E': /* cursor to next line */
		  var amount = parseInt(param);
		  if (isNaN(amount) || amount < 1) amount = 1;
		  this.movecursorpos(0, amount);
		  this.cursor_x = 0;
		  break;
	  case 'F':  /* cursor to preceding line */
		  var amount = parseInt(param);
		  if (isNaN(amount) || amount < 1) amount = 1;
		  this.movecursorpos(0, -amount);
		  this.cursor_x = 0;
		  break;
	  case 'G': /* cursor to column */
		  var amount = parseInt(param);
	          if (isNaN(amount) || amount < 1) amount = 1;
                  this.setcursorpos(amount - 1, this.cursor_y);
		  /*this.cursor_x = amount;*/
	      break;
          case 'T':
              var amount = parseInt(param);
	      if (amount == undefined || isNaN(amount) || amount < 1) amount = 1;
              this.scroll_screen(-amount);
              break;
          case 'X':
	      var amount = parseInt(param);
	      if (isNaN(amount) || amount < 1) amount = 1;
              var tmpx = this.cursor_x;
              while (amount > 0) {
                  amount--;
                  this.putchar(" ");
              }
              this.setcursorpos(tmpx, this.cursor_y);
              break;
	  case 'm': /* set color and attr */
		  var attr = param.split(";");
		  this.setattr(attr);
		  break;
	  case 's': /* save cursor pos */
		  this.savecursor();
	      break;
          case 'r': /* DECSTBM: Set scrolling region */
	      var lines = param.split(";");
	      if (lines == undefined || isNaN(lines[0]) || lines[0] == undefined || lines[1] == undefined) {
                  lines = [ 0, this.SCREEN_HEI - 1 ];
              } else {
                  lines[0]--;
                  lines[1]--;
              }
              this.scroll_lines = lines;
              debugwrite("set scroll lines: ("+lines[0]+","+lines[1]+")");
              break;
	  case 'u': /* restore cursor pos */
		  this.restorecursor();
	      break;
          case 'd': /* VPA: Move cursor to the indicated row, current column. */
	      var amount = parseInt(param);
	      if (isNaN(amount) || amount < 1) amount = 1;
              this.setcursorpos(this.cursor_x, amount - 1);
              break;
	  case 'h':
	  case 'l':
	      if (param.charAt(0) == '?') this.handle_dec_set_reset((code == 'l'), param.substring(1));
	      else {
                  this.handle_dec_set_reset((code == 'l'), param);
                  //debugwrite("<b>UNHANDLED dec set or reset '"+param+"'</b>");
              }
	      break;
          case 't': /* Window manip, XTWINOPS */
              /* ignore; we're not going to change the browser window size/etc */
              /* maybe handle 8;height;width which is screen resize? */
              break;
	  case 'z': /* NAO specific, vt_tiledata option */
	      debugwrite("TODO: <b>vt_tiledata:</b> " + param);
	      break;
	  }
      }


  this.writestr = function(str)
      {
        if (this.prevdata != undefined) {
            str = this.prevdata + str;
            this.prevdata = undefined;
        }
	  var idx = 0;
	  this.had_clrscr = 0;
	  var wrotestr = '';
	  while (idx < str.length) {
	      if (str.charAt(idx) == '\033') {
		  if (wrotestr.length > 0) {
                      if (this.utf8)
                          wrotestr = this.utf8decode(wrotestr);
                      this.putstr(wrotestr);
                      debugwrite("wrote '<tt style='background-color:#eee;'>"+wrotestr.toDebugString()+"</tt>'");
                      wrotestr = '';
                  }
		  var param = '';
		  idx++;
		  switch (str.charAt(idx)) {
		  default:
		      debugwrite('<b>UNHANDLED ESCAPE CODE: '+str.charAt(idx)+'</b>');
		      idx++;
		      break;
                  case '%':
                      idx++;
                      if (str.charAt(idx) == 'G') {
                          this.utf8 = 1;
                          debugwrite("Using UTF-8");
                      }
                      idx++;
                      break;
                  case ']': /* ESC ], aka OSC */
                      /* change colors; ignore */
                      /* skip until we encounter ESC \ aka ST aka string terminator, or BEL */
                      idx++;
                      do {
                          if (str.charAt(idx) == '\033' && str.charAt(idx+1) == '\\') {
                              idx += 2;
                              break;
                          } else if (str.charAt(idx) == '\007') {
                              idx++;
                              break;
                          } else {
                              idx++;
                          }
                      } while (idx < str.length);
                      break;
		  case '[': /* ESC [, aka CSI sequences */
		      idx++;
		      while (!((str.charAt(idx) >= 'a' && str.charAt(idx) <= 'z') ||
			       (str.charAt(idx) >= 'A' && str.charAt(idx) <= 'Z') ||
			       (str.charAt(idx) == '@')) && (idx < str.length)) {
			  param += str.charAt(idx++);
		      }
                      if (idx >= str.length) {
                          /* escape code was split between two ttyrec frames */
                          /* TODO: need to handle this for all... */
                          this.prevdata = "\033[" + param;
                          break;
                      }
		      var code = str.charAt(idx++);
		      this.doescapecode(code, param);
		      break;
		  case '(':
		      var code = str.charAt(idx++);
		      var param = str.charAt(idx++);
		      this.switch_charset(code, param);
		      break;
		  case '7': this.savecursor(); idx++; break;
		  case '8': this.restorecursor(); idx++; break;
		  case '>': idx++; break; /* ignored. numeric keypad mode */
		  case '=': idx++; break; /* ignored. application keypad mode */
		  }
	      } else {
		  var chr = str.charAt(idx++);
                  var wch = chr;
		  wrotestr += wch;
	      }
	  }
	  if (wrotestr.length > 0) {
              if (this.utf8)
                  wrotestr = this.utf8decode(wrotestr);
              this.putstr(wrotestr);
              debugwrite("wrote '<tt style='background-color:#eee;'>"+wrotestr.toDebugString()+"</tt>'");
              wrotestr = '';
          }
      }


}



