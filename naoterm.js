
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
    var output = '';
    for (property in obj) {
	output += property + ': ' + obj[property]+'; ';
    }
    output = output.replaceAll('<','&lt;').replaceAll('&','&amp;');;
    debugwrite('<b>' + output + '</b>');
}

String.prototype.toDebugString = function() {
    return this.replaceAll('<','&lt;').replaceAll('&','&amp;');;
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
 naoterm, by paxed@alt.org
 a javascript vt100 (or thereabouts) terminal emulation,
 mainly meant for replaying nethack TTYRECs.
*/


function naoterm(params)
{
  this.SCREEN_WID = 80;
  this.SCREEN_HEI = 24;

  this.input = [];
  this.failed_input = 0;

  this.hidden_cursor = 0;

  this.XTWINOPS_resize = 0;
  this.OSC_color_change = 1;
  this.colordefs_init = 0;
  this.colordefs = { };

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

  this._scroll_lines = { 'min': -1, 'max': -1 };

  this.screen = new Array(this.hi_x * this.hi_y);

  this.paused = 0;
  this.pause_on_unhandled = 0;

  this.use_alt_charset = 0;
  this.had_clrscr = 0;
  this.utf8 = 0;


    for (var i in params) {
        if (i == "wid") {
            this["SCREEN_WID"] = params[i];
        } else if (i == "hei") {
            this["SCREEN_HEI"] = params[i];
        } else if (this.hasOwnProperty(i)) {
            this[i] = params[i];
        } else {
            debugwrite("<b>ERROR: unknown naoterm param '"+i+"'</B>");
        }
    }

    /* get colors and their definitions from the css */
    this.get_css_colordefs = function()
    {
        if (this.colordefs_init)
            return;
        const ruleList = document.styleSheets[0].cssRules;

        for (const rule of ruleList) {
            if (rule.cssText.match(/^:root/)) {
                var reg = new RegExp("--color([0-9]+): *([^;]+);");
                var str = rule.cssText;
                var repeat = 1;
                do {
                    var found = str.match(reg);
                    if (found != undefined && found[0] != undefined) {
                        this.colordefs[found[1]] = found[2];
                        debugwrite("SET colordef["+found[1]+"]="+found[2]);
                        str = str.replace(reg, "");
                        repeat = 1;
                    } else {
                        repeat = 0;
                    }
                } while (repeat);
                this.colordefs_init = 1;
                return;
            }
        }
    }

    this.get_input = function()
    {
        var ret = '';
        if (this.input.length > 0 && !this.failed_input) {
            var ret = this.input.shift();
        }
        return ret;
    }
    this.fail_input = function(str)
    {
        this.failed_input = 1;
        debugwrite("Input split between two frames");
        if (str != undefined) {
            var tmp = str.split("");
            this.input = tmp.concat(this.input);
        }

    }

    this.replacechars = {
        '<': '&lt;',
        '&': '&amp;',
        '-': '&ndash;',  /* looks better on most monospace web fonts */
    };

  /* missing some chars */
    this.deccharset = {'`':'{', 'a':'&#x2592;', 'j':'-', 'k':'-', 'l':'-', 'm':'-', 'n':'-', 'q':'-', 't':'|', 'u':'|', 'v':'-', 'w':'-', 'x':'|', '~':'&#x00b7;'};

  /* see https://www.rfc-editor.org/rfc/rfc1345.html (CP437) */
  this.ibmcharset = {
      '176':'&#x2591;', /* unlit corridor */
      '177':'&#x2592;', /* lit corridor */
      '179':'&#x2502;', /* wall (vertical) */
      '180':'&#x2524;',
      '191':'&#x2510;', /* top right corner */
      '192':'&#x2514;', /* bottom left corner */
      '193':'&#x2534;',
      '194':'&#x252c;',
      '195':'&#x251c;',
      '196':'&#x2500;', /* wall (horizontal) */
      '197':'&#x253c;', /* cross section */
      '217':'&#x2518;', /* bottom right corner */
      '218':'&#x250c;', /* top left corner */
      '250':'&#x00b7;', /* floor (middle dot) */
      '254':'&#x002d;'  /* open door symbol (hyphen) */
};

  /* decgraphics */
  this.alt_charset2 = {'q' : '&#x2500;',
		       'l' : '&#x250c;',
		       'x' : '&#x2502;',
		       'm' : '&#x2514;',
		       'j' : '&#x2518;',
		       'k' : '&#x2510;',
		       '~' : '&#x00b7;',
		       'a' : '&#x2592;',

		       'o' : '&#x2500;',
		       's' : '&#x2500;',

		       'w' : '&#x252c;',
		       'v' : '&#x2534;',
		       'u' : '&#x2524;',
		       't' : '&#x251c;',

		       'n' : '&#x253c;'}; /* crosswall */


  this.get_idx = function(x,y) { return y*(this.SCREEN_WID+1) + x; }

    this.unhandled = function(str)
    {
        if (this.pause_on_unhandled)
            this.paused = 1;
        debugwrite("<B>UNHANDLED " + str + "</B>");
    }

    this.scroll_lines = function(top, btm)
    {
        var a = (this._scroll_lines.min == -1) ? 0 : this._scroll_lines.min;
        var b = (this._scroll_lines.max == -1) ? this.SCREEN_HEI - 1 : this._scroll_lines.max;
        if (top != undefined && btm != undefined)
            this._scroll_lines = { 'min': top, 'max': btm };
        return {'min':a, 'max':b};
    }

    this.scroll_screen_down = function(numlines)
    {
        var l = this.scroll_lines();

        debugwrite("scroll_screen_down("+numlines+")");
        while (numlines > 0) {
            numlines--;
            for (var y = l.max - 1; y >= l.min; y--) {
                for (var x = 0; x < this.SCREEN_WID; x++) {
                    var tmp = this.get_data(x, y);
                    this.set_data(x, y+1, tmp);
                }
            }
            for (var x = 0; x < this.SCREEN_WID; x++) {
                this.clrcell(x, l.min);
            }
        }
    }

    this.scroll_screen = function(numlines)
    {
        if (numlines < 0) {
            this.scroll_screen_down(-numlines);
            return;
        }

        var l = this.scroll_lines();

        debugwrite("scroll_screen("+numlines+")");
        while (numlines > 0) {
            numlines--;
            for (var y = l.min + 1; y <= l.max; y++) {
                for (var x = 0; x < this.SCREEN_WID; x++) {
                    var tmp = this.get_data(x, y);
                    this.set_data(x, y-1, tmp);
                }
            }
            for (var x = 0; x < this.SCREEN_WID; x++) {
                this.clrcell(x, l.max);
            }
        }
    }

    this.delete_chars = function(numchars)
    {
        if (numchars < 0)
            numchars = 1;

        for (var i = this.cursor_x; i < this.SCREEN_WID; i++) {
            if (i + numchars < this.SCREEN_WID) {
                var tmp = this.get_data(i + numchars, this.cursor_y);
                this.set_data(i, this.cursor_y);
            } else {
                this.clrcell(i + numchars, this.cursor_y);
            }
        }
        debugwrite("delete_chars("+numchars+")");
    }

    this.insert_blanks = function(numchars)
    {
        if (numchars < 0)
            numchars = 1;

        for (var x = this.SCREEN_WID - 1; x >= this.cursor_x; x--) {
            var tmp = this.get_data(x, this.cursor_y);
            this.set_data(x + 1, this.cursor_y, tmp);
        }
        debugwrite("insert_blanks("+numchars+")");
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
      }

  this.get_data = function(x,y)
      {
	  return this.screen[this.get_idx(x,y)];
      }

    this.copy = function()
    {
        var ret = {};
        var fields = ["SCREEN_WID", "SCREEN_HEI", "prevdata", "hidden_cursor",
                      "cursor_x", "cursor_y", "saved_cursor_x", "saved_cursor_y",
                      "saved_attr", "saved_color", "saved_bgcolor", "attr", "color",
                      "bgcolor", "def_color", "def_bgcolor", "hi_x", "hi_y",
                      "use_alt_charset", "had_clrscr", "utf8" ];

        for (var i = 0; i < fields.length; i++) {
            ret[fields[i]] = this[fields[i]];
        }
        ret._scroll_lines = this.scroll_lines();

        ret.screen = new Array(this.hi_x * this.hi_y);
        for (var i = 0; i < this.screen.length; i++) {
            if (this.screen[i] != undefined)
                ret.screen[i] = Object.assign({}, this.screen[i]);
        }
        return ret;
    }

    this.copyFrom = function(data)
    {
        var fields = ["SCREEN_WID", "SCREEN_HEI", "prevdata", "hidden_cursor",
                      "cursor_x", "cursor_y", "saved_cursor_x", "saved_cursor_y",
                      "saved_attr", "saved_color", "saved_bgcolor", "attr", "color",
                      "bgcolor", "def_color", "def_bgcolor", "hi_x", "hi_y",
                      "use_alt_charset", "had_clrscr", "utf8" ];

        for (var i = 0; i < fields.length; i++) {
            this[fields[i]] = data[fields[i]];
        }
        this.scroll_lines(data._scroll_lines.min, data._scroll_lines.max);

        this.screen = new Array(data.hi_x * data.hi_y);
        for (var i = 0; i < data.screen.length; i++) {
            if (data.screen[i] != undefined)
                this.screen[i] = Object.assign({}, data.screen[i]);
        }
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

	  this.SCREEN_WID = wid + 20;
	  this.SCREEN_HEI = hei + 2;
          this.hi_x = wid;
          this.hi_y = hei;

	  delete this.screen;
	  this.screen = new Array(wid * hei);

	  for (y = 0; y < Math.min(this.SCREEN_HEI, tmppanel.SCREEN_HEI); y++) {
	      for (x = 0; x < Math.min(this.SCREEN_WID, tmppanel.SCREEN_WID); x++) {
		  var dat = tmppanel.get_data(x,y);
		  if (dat != undefined) this.set_data(x,y, Object.assign({}, dat));
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

              if (this.replacechars[c] != undefined)
                  c = this.replacechars[c];

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
          } else if (o == 7) {
              debugwrite("putchar(BELL)");
              /* ignore */
	  } else {
              this.unhandled("putchar("+o+")");
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
	  this.cursor_x += x;
	  if (this.cursor_x < 0) this.cursor_x = 0;
	  this.cursor_y += y;
	  if (this.cursor_y < 0) this.cursor_y = 0;
          if (nodebug == undefined)
	      debugwrite("movecursorpos("+x+","+y+")");
        var l = this.scroll_lines();
        if (y == 1 && this.cursor_y > l.max) {
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
                      var clr = parseInt(attr[tmpidx+2]);
                      this.get_css_colordefs();
                      if (this.colordefs[clr] || (clr >= 0 && clr <= 16)) {
                          this.color = clr % 8;
                          if (clr >= 8)
                              this.attr |= 1;
                      } else {
                          debugwrite("<b>Trying to set color to "+clr+"</b>");
                      }
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
                      var clr = parseInt(attr[tmpidx+2]);
                      this.get_css_colordefs();
                      if (this.colordefs[clr] || (clr >= 0 && clr <= 16)) {
                          this.bgcolor = clr % 8;
                          if (clr >= 8)
                              this.attr |= 1;
                      } else {
                          debugwrite("<b>Trying to set bgcolor to "+clr+"</b>");
                      }
                      break;
                  } else {
                      unhandled = 1;
                  }
              }
              else if (a == 49) { this.bgcolor = this.def_bgcolor; }
              else if ((a >= 90) && (a <= 97)) { this.color = a-90; this.attr |= 1; }
              else if ((a >= 100) && (a <= 107)) { this.bgcolor = a-100; this.attr |= 1; }
              else {
                  unhandled = 1;
              }
              if (unhandled)
                  this.unhandled("setattr(" + a + ")");
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
	      if (bg != undefined && bg != this.def_bgcolor)
		  style += ' b'+bg;
	      if (fg != undefined && (fg + bright*8) != this.def_color)
		  style += ' f'+(fg + bright*8);
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
          case 34: break; /* ???? */
	  case 40: break; /* allow 132 cols */
	  case 45: break; /* enable reverse wraparound */
	  case 47: break; /* TODO: switch to alternate buffer? */
	  case 1000: break;
          case 1034: break; /* Don't interpret "meta" key */
	  case 1047: break; /* TODO: switch to alternate screen & clear it. should handle this? */
          case 1048: break; /* TODO: DECSC: save cursor/attr info */
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
            this.unhandled(str);
        else
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

    /* normalize color definition string to #ffffff */
    this.normalize_colordef = function(colorstr)
    {
        colorstr = colorstr.trim();
        colorstr = colorstr.replace(/^rgb:/, "");
        colorstr = colorstr.replace(/\//g, "");
        colorstr = colorstr.replace(/^#/g, "");
        if (!colorstr.match(/^[0-9a-fA-F]+$/)) {
            this.unhandled("normalize_colordef '"+colorstr+"'");
        }
        return "#"+colorstr;
    }

    this.change_color = function(coloridx, colordef)
    {
        colordef = this.normalize_colordef(colordef);
        this.get_css_colordefs();
        this.colordefs[coloridx] = colordef;

        if (!this.OSC_color_change)
            return;
        if (coloridx < 0) {
            this.unhandled("change_color with coloridx="+coloridx);
            return;
        }

        debugwrite("change_color("+coloridx+","+colordef+")");
        const ruleList = document.styleSheets[0].cssRules;
        var ruleidx = 0;
        for (const rule of ruleList) {
            if (rule.cssText.match(/^:root/)) {
                var reg = new RegExp("--color"+coloridx+": [^;]+;");
                var str = rule.cssText;
                var def = "--color"+coloridx+": "+colordef+";";
                if (str.match(reg)) {
                    str = str.replace(reg, def);
                } else {
                    /* add a new color definition to the css */
                    str = str.replace(/} *$/, def + " }");
                }
                document.styleSheets[0].deleteRule(ruleidx);
                document.styleSheets[0].insertRule(str, ruleidx);
                return;
            }
            ruleidx++;
        }
    }

    this.handle_OSC = function(param)
    {
        debugwrite("handle_OSC("+param.toDebugString()+")");
        var params = param.split(";");
        if (parseInt(params[0]) == 4) { /* change color */
            var coloridx = parseInt(params[1]);
            var colordef = params[2];
            this.change_color(coloridx, colordef);
        } else {
            this.unhandled("OSC CODE "+param.toDebugString());
        }
    }

  this.doescapecode = function(code, param)
      {
	  debugwrite("doescapecode("+code.toDebugString()+","+param.toDebugString()+")");
	  switch (code) {
	      default:
	          this.unhandled("ESCAPE CODE (code:"+code.toDebugString()+", param:"+param.toDebugString()+")");
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
	  case '@': /* ICH: insert blank chars */
		  var amount = parseInt(param);
	          if (isNaN(amount) || amount < 1) amount = 1;
                  this.insert_blanks(amount);
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
          case 'P': /* DCH: delete chars */
              var amount = parseInt(param);
              if (amount == undefined || isNaN(amount) || amount < 1) amount = 1;
              this.delete_chars(amount);
              break;
          case 'S': /* SU: scroll up */
              var amount = parseInt(param);
	      if (amount == undefined || isNaN(amount) || amount < 1) amount = 1;
              this.scroll_screen(amount);
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
              this.scroll_lines(lines[0], lines[1]);
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
	      var lines = param.split(";");
              if (lines[0] == "8" && this.XTWINOPS_resize && !isNaN(lines[1]) && !isNaN(lines[2])) {
                  this.resize(parseInt(lines[2]), parseInt(lines[1]));
              }
              break;
	  case 'z': /* NAO specific, vt_tiledata option */
	      debugwrite("TODO: <b>vt_tiledata:</b> " + param);
	      break;
	  }
      }


  this.writestr = function(datastr)
      {
          this.input = this.input.concat(datastr.split(""));
          this.failed_input = 0;
	  this.had_clrscr = 0;
	  var wrotestr = '';
          if (this.paused)
              return;
	  while (!this.failed_input) {
              var inp = this.get_input();
              if (inp == '') {
                  /* failed to get the rest of the input, break out */
                  break;
              } else if (inp == '\033') {
		  if (wrotestr.length > 0) {
                      if (this.utf8)
                          wrotestr = this.utf8decode(wrotestr);
                      this.putstr(wrotestr);
                      debugwrite("wrote '<tt style='background-color:#eee;'>"+wrotestr.toDebugString()+"</tt>'");
                      wrotestr = '';
                  }
                  var esccode = this.get_input();
                  if (esccode == "") {
                      this.fail_input("\033");
                      return;
                  }
		  switch (esccode) {
		  default:
		      this.unhandled('ESCAPE CODE: '+esccode);
		      break;
                  case 'M':
                      this.scroll_screen(-1);
                      break;
                  case '%':
                      var c1 = this.get_input();
                      if (c1 == "") {
                          this.fail_input("\033%");
                          return;
                      }
                      if (c1 == 'G') {
                          this.utf8 = 1;
                          debugwrite("Using UTF-8");
                      }
                      break;
                  case ']': /* ESC ], aka OSC */
                      /* change colors; ignore */
                      /* skip until we encounter BEL, or ESC \ aka ST aka string terminator */
                      var c1;
                      var c2;
		      var param = '';
                      do {
                          c1 = this.get_input();
                          if (c1 == '\007') {
                              break;
                          } else if (c1 == '\033') {
                              c2 = this.get_input();
                              if (c2 == '\\')
                                  break;
                              else if (c2 == "") {
                                  this.fail_input("\033]" + param + "\033");
                                  return;
                              }
                          } else if (c1 == "") {
                              this.fail_input("\033]" + param);
                              return;
                          } else {
                              param += c1;
                          }
                      } while (!this.failed_input);
                      this.handle_OSC(param);
                      /* TODO: handle 10;xx (set default fg color) */
                      /* TODO: handle 11;xx (set default bg color) */
                      break;
		  case '[': /* ESC [, aka CSI sequences */
                      var c1;
                      var param = '';
                      do {
                          c1 = this.get_input();
                          if (c1 == "") {
                              this.fail_input("\033[" + param);
                              return;
                          } else if ((c1 >= 'a' && c1 <= 'z')
                                     || (c1 >= 'A' && c1 <= 'Z')
                                     || (c1 == '@')) {
                              this.doescapecode(c1, param);
                              break;
                          }
                          param += c1;
                      } while (!this.failed_input);
		      break;
		  case '(': /* Designate G0 Character Set */
		      var param = this.get_input();
                      if (param == "") {
                          this.fail_input("\033(");
                          return;
                      }
		      this.switch_charset(esccode, param);
		      break;
                  case ')': /* Designate G1 Character Set */
		      var param = this.get_input();
                      if (param == "") {
                          this.fail_input("\033)");
                          return;
                      }
                      /* TODO: expand this.switch_charset(esccode, param); */
                      break;
		  case '7': this.savecursor(); break;
		  case '8': this.restorecursor(); break;
		  case '>': break; /* ignored. numeric keypad mode */
		  case '=': break; /* ignored. application keypad mode */
		  }
	      } else {
		  wrotestr += inp;
	      }
	  }
	  if (wrotestr.length > 0) {
              if (this.utf8)
                  wrotestr = this.utf8decode(wrotestr);
              this.putstr(wrotestr);
              debugwrite("wrote '<tt style='background-color:#eee;'>"+wrotestr.toDebugString()+"</tt>'");
              wrotestr = '';
          }
          if (this.input.length > 0)
              this.unhandled("INPUT: '"+this.input.join("")+"'");
      }

}



