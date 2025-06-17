#!/usr/bin/env sh
if [ "$1" = "" ]; then
  echo "Usage: $0 <page number>"
  exit 1
fi
curl -s "https://portugalrunning.com/wp-json/wp/v2/ajde_events?per_page=100&orderby=date&order=asc&page=$1"
