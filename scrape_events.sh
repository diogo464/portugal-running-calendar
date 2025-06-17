#!/bin/bash

# Portugal Running Events Scraper
# Fetches running events from Portugal Running calendar
# Usage: ./scrape_events.sh [event_type]
# event_type: 'all' for all events (default), 27 for running events only

set -e

# Default to all events (they are all running events anyway), but allow override
EVENT_TYPE=${1:-all}

BASE_URL="https://www.portugalrunning.com"
CALENDAR_URL="$BASE_URL/calendario-de-corridas/"
API_URL="$BASE_URL/?evo-ajax=eventon_get_events"

# Temporary file for storing the main page
TEMP_PAGE=$(mktemp)

echo "Fetching main page to extract nonces..." >&2
curl -s "$CALENDAR_URL" > "$TEMP_PAGE"

# Extract nonces from the main page
WP_NONCE=$(grep -oE '"nonce":"[^"]+' "$TEMP_PAGE" | head -1 | cut -d'"' -f4)
POST_NONCE=$(grep -oE '"postnonce":"[^"]+' "$TEMP_PAGE" | tail -1 | cut -d'"' -f4)

# Clean up temp file
rm "$TEMP_PAGE"

if [ -z "$WP_NONCE" ] || [ -z "$POST_NONCE" ]; then
    echo "Error: Could not extract nonces from the main page" >&2
    exit 1
fi

echo "Extracted nonces:" >&2
echo "  WP_NONCE: $WP_NONCE" >&2
echo "  POST_NONCE: $POST_NONCE" >&2

echo "Fetching events from API..." >&2

# Make the API request with extracted nonces
curl -s "$API_URL" \
  -X POST \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0' \
  -H 'Accept: application/json, text/javascript, */*; q=0.01' \
  -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
  -H "X-WP-Nonce: $WP_NONCE" \
  -H 'X-Requested-With: XMLHttpRequest' \
  -H "Origin: $BASE_URL" \
  -H "Referer: $CALENDAR_URL" \
  --data-raw "direction=none&shortcode%5B_cver%5D=4.9.10&shortcode%5Baccord%5D=no&shortcode%5Bbottom_nav%5D=no&shortcode%5Bcal_id%5D=&shortcode%5Bcal_init_nonajax%5D=no&shortcode%5Bcalendar_type%5D=default&shortcode%5Bcontrol_style%5D=def&shortcode%5Bel_type%5D=ue&shortcode%5Bep_fields%5D=&shortcode%5Betc_override%5D=no&shortcode%5Bevc_open%5D=no&shortcode%5Bevent_count%5D=1000&shortcode%5Bevent_location%5D=all&shortcode%5Bevent_order%5D=ASC&shortcode%5Bevent_organizer%5D=all&shortcode%5Bevent_parts%5D=no&shortcode%5Bevent_past_future%5D=all&shortcode%5Bevent_status%5D=all&shortcode%5Bevent_tag%5D=all&shortcode%5Bevent_type%5D=$EVENT_TYPE&shortcode%5Bevent_type_2%5D=all&shortcode%5Bevent_type_3%5D=all&shortcode%5Bevent_type_4%5D=all&shortcode%5Bevent_type_5%5D=all&shortcode%5Bevent_virtual%5D=all&shortcode%5Beventtop_date_style%5D=1&shortcode%5Beventtop_style%5D=2&shortcode%5Bexp_jumper%5D=yes&shortcode%5Bexp_so%5D=yes&shortcode%5Bfilter_relationship%5D=AND&shortcode%5Bfilter_show_set_only%5D=no&shortcode%5Bfilter_style%5D=default&shortcode%5Bfilter_type%5D=default&shortcode%5Bfilters%5D=yes&shortcode%5Bfocus_start_date_range%5D=1640995200&shortcode%5Bfocus_end_date_range%5D=1893456000&shortcode%5Bft_event_priority%5D=yes&shortcode%5Bhide_arrows%5D=no&shortcode%5Bhide_cancels%5D=no&shortcode%5Bhide_empty_months%5D=no&shortcode%5Bhide_end_time%5D=no&shortcode%5Bhide_et_dn%5D=no&shortcode%5Bhide_et_extra%5D=no&shortcode%5Bhide_et_tags%5D=no&shortcode%5Bhide_et_tl%5D=no&shortcode%5Bhide_ft%5D=no&shortcode%5Bhide_ft_img%5D=no&shortcode%5Bhide_month_headers%5D=no&shortcode%5Bhide_mult_occur%5D=no&shortcode%5Bhide_past%5D=no&shortcode%5Bhide_past_by%5D=ee&shortcode%5Bhide_so%5D=no&shortcode%5Bics%5D=no&shortcode%5Binclude_any%5D=yes&shortcode%5Bjumper%5D=yes&shortcode%5Bjumper_count%5D=5&shortcode%5Bjumper_offset%5D=0&shortcode%5Blang%5D=L1&shortcode%5Blayout_changer%5D=no&shortcode%5Blivenow_bar%5D=no&shortcode%5Bmapformat%5D=roadmap&shortcode%5Bmapiconurl%5D=&shortcode%5Bmaps_load%5D=no&shortcode%5Bmapscroll%5D=false&shortcode%5Bmapzoom%5D=12&shortcode%5Bmembers_only%5D=no&shortcode%5Bml_priority%5D=no&shortcode%5Bml_toend%5D=no&shortcode%5Bmonth_incre%5D=0&shortcode%5Bnumber_of_months%5D=12&shortcode%5Bonly_ft%5D=no&shortcode%5Bpec%5D=&shortcode%5Bs%5D=&shortcode%5Bsearch%5D=&shortcode%5Bsearch_all%5D=no&shortcode%5Bsep_month%5D=no&shortcode%5Bshow_et_ft_img%5D=yes&shortcode%5Bshow_limit%5D=no&shortcode%5Bshow_limit_ajax%5D=no&shortcode%5Bshow_limit_paged%5D=1&shortcode%5Bshow_limit_redir%5D=&shortcode%5Bshow_repeats%5D=no&shortcode%5Bshow_search%5D=no&shortcode%5Bshow_upcoming%5D=0&shortcode%5Bshow_year%5D=no&shortcode%5Bslide_auto%5D=no&shortcode%5Bslide_hide_control%5D=no&shortcode%5Bslide_nav_dots%5D=no&shortcode%5Bslide_pause_hover%5D=no&shortcode%5Bslide_style%5D=def&shortcode%5Bslider_pause%5D=2000&shortcode%5Bslider_speed%5D=400&shortcode%5Bslider_type%5D=def&shortcode%5Bslides_visible%5D=1&shortcode%5Bsocial_share%5D=no&shortcode%5Bsort_by%5D=sort_date&shortcode%5Btile_bg%5D=0&shortcode%5Btile_bg_size%5D=full&shortcode%5Btile_count%5D=2&shortcode%5Btile_height%5D=0&shortcode%5Btile_style%5D=0&shortcode%5Btiles%5D=no&shortcode%5Btitle%5D=&shortcode%5Bux_val%5D=4&shortcode%5Bview_switcher%5D=no&shortcode%5Bwishlist%5D=yes&shortcode%5Bwishlist_filter%5D=no&shortcode%5Bwpml_l1%5D=&shortcode%5Bwpml_l2%5D=&shortcode%5Bwpml_l3%5D=&shortcode%5Byl_priority%5D=no&shortcode%5Byl_toend%5D=no&ajaxtype=filering&nonce=$POST_NONCE&nonceX=$WP_NONCE"

echo "" >&2
echo "API request completed." >&2
