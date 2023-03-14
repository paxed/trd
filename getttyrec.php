<?php

error_reporting(E_ALL);
ini_set('display_errors','On');

$MAX_FILESIZE = 20000000;

function allowed_files($fname)
{
    /* check the path/filename here and return false if not allowed */
    //return (preg_match('/^https?:\/\/s3\.amazonaws\.com\/altorg\//', $fname) ||
    //        preg_match('/^https?:\/\/alt\.org\/nethack\//', $fname));
    return true;
}

/*
 NOTE: you may need to edit /lib/systemd/system/apache2.service
       and set PrivateTmp=false in there
       and do systemctl daemon-reload && systemctl restart apache2
 */

if (!isset($_GET['file']))
    fake_ttyrec("No file given");

$fname = rawurldecode($_GET['file']);
//$offset = (isset($_GET['pos']) ? $_GET['pos'] : 0);
//$slurp = (isset($_GET['slurp']) ? $_GET['slurp'] : 0);

//if (!preg_match('/^[0-9]+$/', $offset)) exit;

if (allowed_files($fname)) {

    $regex_ext = "/\.ttyrec(\.(gz|bz2))?$/";

    if (!preg_match($regex_ext, $fname) ||
        preg_match("/[\\%'\"]/", $fname))
        fake_ttyrec("Illegal file name");

    $fname = preg_replace('/\.\.+/', '.', $fname);
    //$fname = str_replace('..', '.', $fname);

    $fname_x = preg_replace('/^https?:\/\/alt\.org\/nethack\//','/var/www/alt.org/nethack/', $fname);

    if (preg_match($regex_ext, $fname_x, $matches)) {
        $compress_ext = isset($matches[1]) ? $matches[1] : "";
        if ($compress_ext != "")
            $fname_nozip = substr($fname_x, 0, -strlen($compress_ext));
        else
            $fname_nozip = $fname_x;

	$fname_tmp = "/tmp/trd/".basename($fname_nozip);

	if (!file_exists($fname_tmp) || file_exists($fname_tmp) && (filectime($fname_tmp)+3600 < time())) {
            $unpackcmd = "";
            switch ($compress_ext) {
            case ".gz": $unpackcmd = " | /usr/bin/gunzip - "; break;
            case ".bz2": $unpackcmd = " | /usr/bin/bunzip2 - "; break;
            default: break;
            }
            exec("/usr/bin/curl -f -s '" . $fname . "'" . $unpackcmd . " > '" . $fname_tmp . "'");
	}
	$fname_x = $fname_tmp;
    }

    if (is_readable($fname_x)) {
        $fsize = filesize($fname_x);
        if ($fsize > $MAX_FILESIZE) {
            fake_ttyrec("ttyrec too big");
        } else if ($fsize == 0) {
            fake_ttyrec("No such file");
        } else {
            dump_ttyrec($fname_x);
        }
    } else
        fake_ttyrec("No such file");
}

function fake_ttyrec($error)
{
    header('Content-Type: binary/octet-stream');
    /* fake a ttyrec format, replace time and data len with spaces */
    print rawurlencode(str_repeat(" ",3*4)."\033[1;5;33;41mERROR: " . $error);
    exit;
}

function dump_ttyrec($fname_x)
{
    header('Content-Type: binary/octet-stream');
    print rawurlencode(file_get_contents($fname_x));
    exit;
}

function dump_ttyrec_frame($fname_x, $offset)
{
    $fh = @fopen($fname_x, "r");
    if (!$fh) exit;

    if (@fseek($fh, $offset) == -1) exit;

    @fread($fh, 8); /* skip timing info */
    $lengthstr = @fread($fh, 4);
    if (!$lengthstr) exit;
    $dlen = ord($lengthstr[0]) | (ord($lengthstr[1]) << 8) | (ord($lengthstr[2]) << 16) | (ord($lengthstr[3]) << 24);

    if ($dlen > 40000) exit;

    @fseek($fh, $offset);

    $dstr = rawurlencode(@fread($fh, $dlen + 8+4));
    header('Content-Type: binary/octet-stream');
    header('Content-Length: '.strlen($dstr));
    print $dstr;
    exit;
}

?>
