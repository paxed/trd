<?php

include "config.php";

/* return a random line from this file. */

if (is_readable($RND_TTYRECS)) {
    $f_contents = file($RND_TTYRECS);
    $line = $f_contents[rand(0, count($f_contents) - 1)];
    print $line;
}
?>
