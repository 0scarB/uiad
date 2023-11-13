#!/bin/bash

set -e
set -u

if [ -f 'test.mjs' ]; then
    echo 'Removing "test.mjs"...'
    rm 'test.mjs'
fi
if [ -f 'test.html' ]; then
    echo 'Removing "test.html"...'
    rm 'test.html'
fi

echo 'Compiling "test.mts" to "test.mjs"...'
tsc \
    --allowJs \
    --checkJs \
    --target 'es6' \
    --lib 'es2015,dom' \
    --outDir '.' \
    'test.mts'
echo 'Compiled "test.mts" to "test.mjs"'

echo 'Creating "test.html", with contents of "test.mjs" and "index.mjs" in <script> tags...'
touch 'test.html'
echo '<!DOCTYPE html>'                                                                >> 'test.html'
echo '<html lang="en">'                                                               >> 'test.html'
echo '<head>'                                                                         >> 'test.html'
echo '    <meta charset="UTF-8">'                                                     >> 'test.html'
echo '    <meta name="viewport" content="width=device-width, initial-scale=1.0">'     >> 'test.html'
echo '<script id="lib" type="module">'                                                >> 'test.html'
# The contents of 'index.mjs' is injected into the script tag with id=lib
cat 'index.mjs'                                                                       >> 'test.html'
echo '</script>'                                                                      >> 'test.html'
echo '    <title>UIAD Tests</title>'                                                  >> 'test.html'
echo '</head>'                                                                        >> 'test.html'
echo '<body>'                                                                         >> 'test.html'
echo '    <main id="log"></main>'                                                     >> 'test.html'
echo '<script type="module">'                                                         >> 'test.html'
# The inner html of the script tag with id=lib is converted to a data url and imported
echo 'const libText = document.getElementById("lib").innerHTML'                       >> 'test.html'
echo 'const libModule = await import(`data:text/javascript;base64,` + btoa(libText))' >> 'test.html'
# The import statement in 'test.mts' 
# is replaced with a call to the import function on the libModule object
sed -E 's/import (.+) from .+/const \1 = libModule/g' test.mjs                        >> 'test.html'
echo '</script>'                                                                      >> 'test.html'
echo '</body>'                                                                        >> 'test.html'
echo '</html>'                                                                        >> 'test.html'
echo 'Created "test.html".'