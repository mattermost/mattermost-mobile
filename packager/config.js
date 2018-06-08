// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable no-console */
const blacklist = require('metro-bundler/src/blacklist');
const modulePaths = require('./modulePaths');
const resolve = require('path').resolve;
const fs = require('fs');

const platformRegex = /\.(android\.js|ios\.js)/g;
const modulesRegex = /\/(node_modules)/;

// This script will let the react native packager what modules to include
// in the main bundle and what modules to blacklist from the inline requires
// this modules are taken from the modulePaths.js file

// Also, includes blacklisting translation files that
// you do not wish packaging into the build

const supportedTranslations = require('./translations').supportedTranslations;
const blacklistTranslations = require('./translations').blacklistTranslations;
const whitelistTranslations = supportedTranslations.filter(t => !blacklistTranslations.includes(t));

// creates /app/i18n/loader.js file
const ex =
    "{\n" +
    whitelistTranslations.map(translation => {
        // include json translation files
        const jsonFile = `    '${translation}': require('assets/i18n/${translation}.json'),`;

        // include locale data from react-intl
        const locale = translation.split('-')[0];
        const localeFile = `    '${translation}-Locale': require('react-intl/locale-data/${locale}'),`;

        return jsonFile + '\n' + localeFile
    }).join('\n') +
    "\n};";

const licenseHeader = "// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.\n" +
    "// See License.txt for license information.\n\n";
const loaderComment = `// Loader.js supports: [${whitelistTranslations.join(', ')}]\n`;
const res = licenseHeader + loaderComment + "export default " + ex;
fs.writeFileSync('./app/i18n/loader.js', res);

const config = {
    getTransformOptions: (entryFile, {platform}) => {
        console.log('BUILDING MODULES FOR', platform);
        const moduleMap = {};
        modulePaths.forEach((path) => {
            let realPath = path;
            if (platform && platformRegex.test(realPath)) {
                realPath = path.replace(platformRegex, `.${platform}.js`);
            }

            let fsFile = realPath;
            if (path.match(modulesRegex).length > 1) {
                fsFile = path.replace(modulesRegex, '');
            }

            if (fs.existsSync(fsFile)) {
                moduleMap[resolve(realPath)] = true;
            }
        });
        return {
            preloadedModules: moduleMap,
            transform: {
                inlineRequires: {
                    blacklist: moduleMap,
                },
            },
        };
    },
    getBlacklistRE: () => {
        console.log('BLACKLISTING FILES FROM BUNDLE');
        let blacklistFiles = [];

        if (blacklistTranslations.length) {
            console.log(`Blacklisting ${blacklistTranslations.length} translations!`)
            console.log(`Blacklisting locales: [${blacklistTranslations.toString()}]`);
        }

        blacklistTranslations.forEach(translation => {
            const locale = translation.split('-')[0];
            blacklistFiles.push(`assets/i18n/${translation}.json`);
            blacklistFiles.push(`react-intl/locale-data/${locale}`);
        });

        // Ignore locale-data/index.js and whitelisted translations
        let localeData = whitelistTranslations.map(t => t.split('-')[0]);
        localeData = Array.from(new Set(localeData));

        const reactIntlLocaleDataRegex = new RegExp(`node_modules\\/react-intl\\/locale-data\\/(?!index|${localeData.join('|')})[a-z0-9]+.js`);

        return blacklist([
            reactIntlLocaleDataRegex,
            ...blacklistFiles,
        ]);
    }
};

module.exports = config;
