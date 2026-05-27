// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const path = require('path');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

// refractor 5.x moved its entry points under lib/ and language files under
// lang/, relying on package.json exports maps that Metro 0.80 doesn't support.
// We implement the exports map manually:
//   "."          -> lib/common.js
//   "./all"      -> lib/all.js
//   "./core"     -> lib/core.js
//   "./*"        -> lang/*.js  (all language files)
const refractorRoot = path.resolve(__dirname, 'node_modules/refractor');
const refractorExact = {
    'refractor': path.join(refractorRoot, 'lib/common.js'),
    'refractor/all': path.join(refractorRoot, 'lib/all.js'),
    'refractor/core': path.join(refractorRoot, 'lib/core.js'),
};

// @formatjs packages declare a wildcard export './locale-data/*' -> './locale-data/*'
// (no .js extension). Metro resolves this to the exact extensionless path which doesn't
// exist — the actual files are locale-data/<locale>.js — causing a warning for every
// locale on every Metro startup. Intercept and redirect to the real .js file.
const formatjsLocalePattern = /^@formatjs\/(intl-(?:pluralrules|numberformat|datetimeformat|listformat|relativetimeformat|displaynames))\/locale-data\/([^/]+)$/;

const config = {
    resolver: {
        blockList: [
            /.*\.test\.(js|jsx|ts|tsx)$/,
            /.*\.spec\.(js|jsx|ts|tsx)$/,
            /__tests__\/.*/,
            /__mocks__\/.*/,
        ],
        resolveRequest: (context, moduleName, platform) => {
            if (Object.prototype.hasOwnProperty.call(refractorExact, moduleName)) {
                return {type: 'sourceFile', filePath: refractorExact[moduleName]};
            }

            // refractor/*.* -> refractor/lang/*.js  (exports "./*": "./lang/*.js")
            if (moduleName.startsWith('refractor/') && !moduleName.includes('/lang/')) {
                const lang = moduleName.slice('refractor/'.length);
                const filePath = path.join(refractorRoot, 'lang', `${lang}.js`);
                if (require('fs').existsSync(filePath)) {
                    return {type: 'sourceFile', filePath};
                }
            }

            // @formatjs/**/locale-data/<locale> -> locale-data/<locale>.js
            const formatjsMatch = moduleName.match(formatjsLocalePattern);
            if (formatjsMatch) {
                const [, pkg, locale] = formatjsMatch;
                const filePath = path.join(__dirname, 'node_modules/@formatjs', pkg, 'locale-data', `${locale}.js`);
                if (require('fs').existsSync(filePath)) {
                    return {type: 'sourceFile', filePath};
                }
            }

            return context.resolveRequest(context, moduleName, platform);
        },
    },
    transformer: {
        unstable_allowRequireContext: true,
    },
};

module.exports = mergeConfig(defaultConfig, config);
