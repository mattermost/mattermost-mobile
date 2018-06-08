// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const supportedTranslations = [
    'de',
    'en',
    'es',
    'fr',
    'it',
    'ja',
    'ko',
    'nl',
    'pl',
    'pt-BR',
    'ru',
    'tr',
    'zh-CN',
    'zh-TW',
];

// Add locales you DO NOT want packaged in Loader.js
const blacklistTranslations = [];

module.exports = {
    supportedTranslations,
    blacklistTranslations
};
