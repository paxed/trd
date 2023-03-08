<?php

$dir = "/tmp/trd/";

@mkdir($dir);
@chmod($dir, 0777);
$starttime = time();
$all_ttyrecs = $dir."all_ttyrecs.txt";

/* if (@filemtime($all_ttyrecs) + 60*60*24*2 < $starttime) {
    print "Generating a list of all TTYRECS.\n";
    $all_ttyrecs_tmp = $all_ttyrecs.".tmp";
    exec("/usr/bin/find /opt/nethack/nethack.alt.org/dgldir/userdata/ -iname *.ttyrec > ".$all_ttyrecs_tmp);
    exec("/usr/bin/find /opt/nethack/nethack.alt.org/dgldir/userdata/ -iname *.ttyrec.bz2 >> ".$all_ttyrecs_tmp);
    rename($all_ttyrecs_tmp, $all_ttyrecs);
    chmod($all_ttyrecs, 0644);
} */

$count = 0;
if ($handle = opendir($dir)) {
    while (false !== ($file = readdir($handle))) {
	if (preg_match('/\.ttyrec$/', $file)) {
	    if (filemtime($dir.$file) + 60*60*24*1 < $starttime) {
		if (unlink($dir.$file))
		    $count++;
	    }
	}
    }
    closedir($handle);
}
/*if ($count) print "Removed ".$count." temporary TTYRECs for being too old.\n";*/
