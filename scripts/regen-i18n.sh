#!/usr/bin/env bash

echo Regenerating i18n files

rm -rf assets/base/i18n/en.json
echo "{}" > assets/base/i18n/en.json

npm run i18n-extract

echo assets/base is now regenerated. Rebuilding dist/assets/i18n

node scripts/generate-assets.js

echo i18n files are now regenerated.