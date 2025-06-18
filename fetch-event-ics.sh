#!/usr/bin/env sh
if [ "$1" == "" ]; then
    echo "Usage: $0 <event id>"
    exit 1
fi
curl "http://www.portugalrunning.com/export-events/$1_0/"
