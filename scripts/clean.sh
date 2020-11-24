#!/usr/bin/env bash

echo Cleaning started

rm -rf ios/Pods
rm -rf node_modules
rm -rf dist
rm -rf ios/build
rm -rf android/app/build

echo Cleanup finished