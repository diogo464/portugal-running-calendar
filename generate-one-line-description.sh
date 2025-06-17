#!/usr/bin/sh
set -e

SYSTEM="""
you are a helpful llm that converts descriptions of running events into succint one line descriptions, condensing that information and outputing only the essential.
here are some examples of the outputs you should generate:
+ The world's oldest annual marathon
+ Scenic run through Central Park
+ Run along Lake Michigan
+ Challenging trail through Texas Hill Country
+ Beautiful bay views throughout the course
+ High altitude marathon with mountain views
+ Independence Day beach run
+ Extreme endurance challenge in Pacific Northwest

you should output ONLY the single line description you generate and NOTHING else.
use the available information in the description and DO NOT make up anything that isn't there.
"""

llm -m llama3.2:latest -s "$SYSTEM" "$1"
