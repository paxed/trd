<?php

/* return a random line from this file.
   it should contain public URLs to specific ttyrec files */
$fname = '/tmp/trd/all_ttyrecs.txt';

if (is_readable($fname)) {
    $f_contents = file($fname);
    $line = $f_contents[rand(0, count($f_contents) - 1)];
    print $line;
}
?>
