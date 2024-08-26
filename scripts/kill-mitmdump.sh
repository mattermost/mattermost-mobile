#!/bin/bash

## catch the exit code & apply logic accordingly
function finish() {
  # Your cleanup code here
  rv=$?
  echo "the error code received is $rv"
  if [ $rv -eq 137 ];
  then
    echo "It's a manual kill, attempting another run or whatever"
  elif [ $rv -eq 0 ];
  then
    echo "Exited smoothly"
  else
    echo "Non 0 & 137 exit codes"
    exit $rv
  fi
}

pgrep -fi mitmdump
if [ $? -eq 0 ];
then
  echo "Killing the previous process"
  kill -9 $(pgrep -fi mitmdump)
else
  echo "No previous process exists."
fi
trap finish EXIT
