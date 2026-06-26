#!/usr/bin/env bash
# Map IANA timezone (e.g. America/New_York) to the region label shown in Settings
# (matches app/utils/user getTimezoneRegion: last path segment, underscores to spaces).
timezone_region_from_iana() {
  local tz="${1:-America/New_York}"
  local region="${tz##*/}"
  echo "${region//_/ }"
}
