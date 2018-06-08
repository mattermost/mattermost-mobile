// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'intl';
import {addLocaleData} from 'react-intl';
import enLocaleData from 'react-intl/locale-data/en';

import en from 'assets/i18n/en.json';
import Loader from './loader';

const TRANSLATIONS = {en};

export const DEFAULT_LOCALE = 'en';

addLocaleData(enLocaleData);

function loadTranslation(locale) {
    try {
        TRANSLATIONS[locale] = Loader[locale];
        const localeData = Loader[`${locale}-Locale`];

        if (localeData) {
            addLocaleData(localeData);
        }
    } catch (e) {
        console.error('NO Translation found', e); //eslint-disable-line no-console
    }
}

export function getTranslations(locale) {
    if (!TRANSLATIONS[locale]) {
        loadTranslation(locale);
    }
    return TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
}
