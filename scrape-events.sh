#!/bin/bash

# Portugal Running Events Scraper (Yearly Calendar)
# Fetches all event types from Portugal Running yearly calendar
# Uses the eventon_init_load endpoint for comprehensive coverage

set -e

BASE_URL="https://www.portugalrunning.com"
CALENDAR_URL="$BASE_URL/calendario-de-corridas-anual/"
API_URL="$BASE_URL/?evo-ajax=eventon_init_load"

# Temporary file for storing the main page
TEMP_PAGE=$(mktemp)

echo "fetching yearly calendar page to extract nonces..." >&2
curl -s "$CALENDAR_URL" > "$TEMP_PAGE"

# Extract nonces from the main page
WP_NONCE=$(grep -oE '"nonce":"[^"]+' "$TEMP_PAGE" | head -1 | cut -d'"' -f4)
POST_NONCE=$(grep -oE '"postnonce":"[^"]+' "$TEMP_PAGE" | tail -1 | cut -d'"' -f4)

# Clean up temp file
rm "$TEMP_PAGE"

if [ -z "$WP_NONCE" ] || [ -z "$POST_NONCE" ]; then
    echo "error: could not extract nonces from the main page" >&2
    exit 1
fi

echo "extracted nonces:" >&2
echo "  wp_nonce: $WP_NONCE" >&2
echo "  post_nonce: $POST_NONCE" >&2

echo "fetching events from yearly calendar api..." >&2

# Make the API request with extracted nonces using the yearly calendar endpoint
curl -s "$API_URL" \
  --compressed \
  -X POST \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0' \
  -H 'Accept: application/json, text/javascript, */*; q=0.01' \
  -H 'Accept-Language: en-US,en;q=0.5' \
  -H 'Accept-Encoding: gzip, deflate, br, zstd' \
  -H 'Content-Type: application/x-www-form-urlencoded; charset=UTF-8' \
  -H 'X-Requested-With: XMLHttpRequest' \
  -H "Origin: $BASE_URL" \
  -H 'DNT: 1' \
  -H 'Sec-GPC: 1' \
  -H 'Alt-Used: www.portugalrunning.com' \
  -H 'Connection: keep-alive' \
  -H "Referer: $CALENDAR_URL" \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'TE: trailers' \
  --data-raw "global%5Bcalendars%5D%5B%5D=EVOYV&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Baccord%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bbottom_nav%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bcal_id%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bcal_init_nonajax%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bcalendar_type%5D=yearly&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bcontrol_style%5D=def&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bel_type%5D=ue&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bep_fields%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Betc_override%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevc_open%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_count%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_location%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_order%5D=ASC&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_organizer%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_parts%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_past_future%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_status%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_tag%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_type%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_type_2%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_type_3%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_type_4%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_type_5%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bevent_virtual%5D=all&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Beventtop_date_style%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Beventtop_style%5D=2&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bexp_jumper%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bexp_so%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfilter_relationship%5D=AND&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfilter_show_set_only%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfilter_style%5D=default&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfilter_type%5D=default&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfilters%5D=yes&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfixed_month%5D=6&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfixed_year%5D=2025&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfocus_end_date_range%5D=1767225599&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfocus_start_date_range%5D=1735689600&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bft_event_priority%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bheat_circles%5D=yes&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_arrows%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_cancels%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_empty_months%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_end_time%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_et_dn%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_et_extra%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_et_tags%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_et_tl%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_ft%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_ft_img%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_month_headers%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_mult_occur%5D=yes&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_past%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_past_by%5D=ee&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhide_so%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bhover_style%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bics%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Binclude_any%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bjumper%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bjumper_count%5D=5&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bjumper_offset%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Blang%5D=L1&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Blayout_changer%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Blivenow_bar%5D=yes&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bload_as_clicked%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bloading_animation%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bmapformat%5D=roadmap&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bmapiconurl%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bmaps_load%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bmapscroll%5D=false&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bmapzoom%5D=12&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bmembers_only%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bml_priority%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bml_toend%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bmonth_incre%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bnumber_of_months%5D=12&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bonly_ft%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bpec%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bs%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bsearch%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bsearch_all%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bsep_month%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_et_ft_img%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_limit%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_limit_ajax%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_limit_paged%5D=1&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_limit_redir%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_repeats%5D=yes&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_search%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_upcoming%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bshow_year%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslide_auto%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslide_hide_control%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslide_nav_dots%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslide_pause_hover%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslide_style%5D=def&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslider_pause%5D=2000&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslider_speed%5D=400&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslider_type%5D=def&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bslides_visible%5D=1&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bsocial_share%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bsort_by%5D=sort_date&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Btile_bg%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Btile_bg_size%5D=full&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Btile_count%5D=2&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Btile_height%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Btile_style%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Btiles%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Btitle%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bux_val%5D=0&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bview_switcher%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bwishlist%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bwishlist_filter%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bwpml_l1%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bwpml_l2%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bwpml_l3%5D=&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Byl_priority%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Byl_toend%5D=no&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5Bfixed_day%5D=17&cals%5Bevcal_calendar_837%5D%5Bsc%5D%5B_cver%5D=4.9.10&nonce=$POST_NONCE" \
  > events-raw.json

echo "" >&2
echo "api request completed." >&2