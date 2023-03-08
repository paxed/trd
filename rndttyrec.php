<?php

$fname = '/tmp/trd/all_ttyrecs.txt';

if (is_readable($fname)) {

    $size = filesize($fname);
    $offset = rand(0, $size-1024);

    $fh = @fopen($fname, "r");
    @fseek($fh, $offset);

    $str = @fread($fh, 1024);

    @fclose($fh);

    $lines = explode("\n", $str);
    $line = $lines[1];

    $line_url = preg_replace('/^\/opt\/nethack\/nethack\.alt\.org\/dgldir\//', 'https://alt.org/nethack/', $line);

    print $line_url;
}
?>
