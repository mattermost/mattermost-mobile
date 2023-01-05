#!/usr/bin/env bash

if [[ "$OSTYPE" == "darwin"* ]]; then
  if !(gem list bundler -i --version 2.3.26) > /dev/null 2>&1; then
    echo "Installing Bundler"
    gem install bundler --version 2.3.26
  fi
fi