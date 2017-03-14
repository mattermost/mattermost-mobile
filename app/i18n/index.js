// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'intl';

import en from 'assets/i18n/en.json';
import es from 'assets/i18n/es.json';

const DEFAULT_LOCALE = 'en';

const TRANSLATIONS = {
    en,
    es
};

export function getTranslations(locale) {
    return TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
}
