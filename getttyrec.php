<?php

error_reporting(E_ALL);
ini_set('display_errors','On');

include "config.php";

/*
 NOTE: you may need to edit /lib/systemd/system/apache2.service
       and set PrivateTmp=false in there
       and do systemctl daemon-reload && systemctl restart apache2
 */

if (!isset($_GET['file']))
    fake_ttyrec("No file given");

$fname = rawurldecode($_GET['file']);

if (allowed_files($fname)) {

    if (!preg_match($REGEX_EXT, $fname) ||
        !preg_match("/^[-a-zA-Z0-9:\/\.~_]+$/", $fname))
        fake_ttyrec("Illegal file name");

    $fname = preg_replace('/\.\.+/', '.', $fname);

    if (preg_match($REGEX_EXT, $fname, $matches)) {
        $compress_ext = isset($matches[1]) ? $matches[1] : "";
        if ($compress_ext != "")
            $fname_nozip = substr($fname, 0, -strlen($compress_ext));
        else
            $fname_nozip = $fname;

        if (!is_dir($CACHE_PATH)) {
            if (!file_exists($CACHE_PATH))
                @mkdir($CACHE_PATH);
        }

	$fname_tmp = $CACHE_PATH . "/" . basename($fname_nozip);

	if (!file_exists($fname_tmp) ||
            file_exists($fname_tmp) && (filectime($fname_tmp)+$CACHE_TIME < time()
                                        || filesize($fname_tmp) == 0)) {
            $unpackcmd = "";
            if (isset($UNPACK_PRG[$compress_ext]))
                $unpackcmd = " | ".$UNPACK_PRG[$compress_ext];

            exec($CURL_PRG . " '" . $fname . "'" . $unpackcmd . " > '" . $fname_tmp . "'");
	}

        if (is_readable($fname_tmp)) {
            $fsize = filesize($fname_tmp);
            if ($fsize > $MAX_FILESIZE) {
                fake_ttyrec("ttyrec too big");
            } else if ($fsize == 0) {
                fake_ttyrec("No such file");
            } else {
                dump_ttyrec($fname_tmp);
            }
        } else {
            fake_ttyrec("No such file");
        }
    } else {
        fake_ttyrec("Unknown file type");
    }
} else {
    fake_ttyrec("No such file");
}

function fake_ttyrec($error)
{
    header('Content-Type: binary/octet-stream');
    /* fake a ttyrec format, replace time and data len with spaces */
    print rawurlencode(str_repeat(" ",3*4)."\033[1;5;33;41mERROR: " . $error);
    exit;
}

function dump_ttyrec($fname)
{
    header('Content-Type: binary/octet-stream');
    print rawurlencode(file_get_contents($fname));
    exit;
}

?>
