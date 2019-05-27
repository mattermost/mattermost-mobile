#!/bin/sh

# Start emulator and run tests
emulator @Pixel_8.1 & npm run test:android

# Capture test exit status
TESTS_EXIT_STATUS=$?

# Kill emulator
adb emu kill

exit $TESTS_EXIT_STATUS

