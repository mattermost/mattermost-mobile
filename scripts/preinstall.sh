#!/usr/bin/env bash

function cocoapods() {
    echo "Installing Cocoapods"
    if [[ $(uname -p) == 'arm' ]]; then
      npm run ios-gems-m1 &> /dev/null || exit 1
    else
      npm run ios-gems &> /dev/null  || exit 1
    fi
    
}

if [[ "$OSTYPE" == "darwin"* ]]; then
  if !(gem list cocoapods -i --version 1.16.1) > /dev/null 2>&1; then
    cocoapods
  fi
fi