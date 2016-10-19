// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import en from 'i18n/en.json';

const DEFAULT_LOCALE = 'en';

const TRANSLATIONS = {
    en
};

export function getTranslations(locale) {
    return TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
}
