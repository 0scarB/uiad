#!/bin/bash

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open 'test.html'
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open 'test.html'
elif [[ "$OSTYPE" == "cygwin" ]]; then
    start 'test.html'
else
    echo "ERROR: Unhandled operating system type '$OSTYPE'. Feel free to submit a PR :)"
    exit 1
fi