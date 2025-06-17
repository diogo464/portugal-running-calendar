#!/usr/bin/env sh
if [ "$1" = "" ]; then
  echo "Usage: $0 <event id>"
  exit 1
fi

GET "https://portugalrunning.com/wp-json/wp/v2/ajde_events/$1"  | jq
