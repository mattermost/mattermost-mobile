#!/usr/bin/env bash

mkdir -p tmp
cp assets/base/i18n/en.json tmp/en.json
mkdir -p tmp/fake-webapp-dir/i18n/
echo '{}' > tmp/fake-webapp-dir/i18n/en.json

npm run mmjstool -- i18n extract-mobile --webapp-dir tmp/fake-webapp-dir --mobile-dir .
diff tmp/en.json assets/base/i18n/en.json
# Address weblate behavior which does not remove whole translation item when translation string is set to empty
npm run mmjstool -- i18n clean-empty --webapp-dir tmp/fake-webapp-dir --mobile-dir . --check
npm run mmjstool -- i18n check-empty-src --webapp-dir tmp/fake-webapp-dir --mobile-dir .

rm -rf tmp

