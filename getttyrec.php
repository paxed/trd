<?php

error_reporting(E_ALL);
ini_set('display_errors','On');


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

$fname = rawurldecode($_GET['file']);
$offset = (isset($_GET['pos']) ? $_GET['pos'] : 0);

if (!preg_match('/^[0-9]+$/', $offset)) exit;

if (allowed_files($fname)) {

    if (!preg_match('/\.ttyrec(\.gz)?$/', $fname)) exit;

    $fname = preg_replace('/\.\.+/', '.', $fname);
    //$fname = str_replace('..', '.', $fname);

    $fname_x = preg_replace('/^https?:\/\/alt\.org\/nethack\//','/var/www/alt.org/nethack/', $fname);

    if (preg_match('/\.ttyrec\.gz$/', $fname_x)) {
	$fname_nozip = substr($fname_x, 0, -3);

	$fname_tmp = "/tmp/trd/".basename($fname_nozip);

	if (!file_exists($fname_tmp) || file_exists($fname_tmp) && (filectime($fname_tmp)+3600 < time())) {
            print "BBB\n";
	    /* exec("/bin/bzcat ".$fname_x." > ".$fname_tmp); */
            exec("/usr/bin/curl -s ".$fname." | /usr/bin/gunzip - > ".$fname_tmp);
	}
	$fname_x = $fname_tmp;
    }

    if (is_readable($fname_x)) {
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
}

?>
