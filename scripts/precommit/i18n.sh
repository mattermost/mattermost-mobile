#!/usr/bin/env bash
set -e

mkdir -p tmp
cp assets/base/i18n/en.json tmp/en.json

npm run mmjstool -- i18n extract-mobile --mobile-dir .
diff tmp/en.json assets/base/i18n/en.json
# Address weblate behavior which does not remove whole translation item when translation string is set to empty
npm run mmjstool -- i18n clean-empty-mobile --mobile-dir . --check

rm -rf tmp

