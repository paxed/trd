<?php

$MAX_FILESIZE = 20000000;
$CACHE_PATH = "/tmp/trd";
$CACHE_TIME = 3600;
$CURL_PRG = "/usr/bin/curl -f -s";
$REGEX_EXT = "/\.ttyrec(\.(gz|bz2))?$/";
$UNPACK_PRG = [
               ".gz" => "/usr/bin/gunzip - ",
               ".bz2" => "/usr/bin/bunzip2 - ",
               ];

/* should contain public URLs to specific ttyrec files */
$RND_TTYRECS = $CACHE_PATH."/rnd_ttyrecs.txt";

function allowed_files($fname)
{
    /* check the path/filename here and return false if not allowed */
    //return (preg_match('/^https?:\/\/s3\.amazonaws\.com\/altorg\//', $fname) ||
    //        preg_match('/^https?:\/\/alt\.org\/nethack\//', $fname));
    return true;
}
