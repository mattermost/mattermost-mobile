#!/usr/bin/env bash

function cocoapods() {
    echo "Installing Cocoapods"
    npm run ios-gems &> /dev/null || exit 1
}

if [[ "$OSTYPE" == "darwin"* ]]; then
  if !(gem list bundler -i --version 2.5.11) > /dev/null 2>&1; then
    echo "Installing Bundler"
    gem install bundler --version 2.5.11  || exit 1
  fi

  if !(gem list cocoapods -i --version 1.16.1) > /dev/null 2>&1; then
    cocoapods
  fi
fi