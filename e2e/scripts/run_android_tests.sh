#!/bin/sh

# Start emulator and run tests
emulator @Pixel_8.1 & ./node_modules/.bin/wdio test/configs/android.conf.js

# Capture test exit status
TESTS_EXIT_STATUS=$?

# Kill emulator
adb emu kill

exit $TESTS_EXIT_STATUS

