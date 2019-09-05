// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import 'intl';
import {addLocaleData} from 'react-intl';
import enLocaleData from 'react-intl/locale-data/en';
import moment from 'moment';

import en from 'assets/i18n/en.json';

const TRANSLATIONS = {en};

export const DEFAULT_LOCALE = 'en';

addLocaleData(enLocaleData);

function loadTranslation(locale) {
    try {
        let localeData;
        let momentData;
        switch (locale) {
        case 'de':
            TRANSLATIONS.de = require('assets/i18n/de.json');
            localeData = require('react-intl/locale-data/de');
            momentData = require('moment/locale/de');
            break;
        case 'es':
            TRANSLATIONS.es = require('assets/i18n/es.json');
            localeData = require('react-intl/locale-data/es');
            momentData = require('moment/locale/es');
            break;
        case 'fr':
            TRANSLATIONS.fr = require('assets/i18n/fr.json');
            localeData = require('react-intl/locale-data/fr');
            momentData = require('moment/locale/fr');
            break;
        case 'it':
            TRANSLATIONS.it = require('assets/i18n/it.json');
            localeData = require('react-intl/locale-data/it');
            momentData = require('moment/locale/it');
            break;
        case 'ja':
            TRANSLATIONS.ja = require('assets/i18n/ja.json');
            localeData = require('react-intl/locale-data/ja');
            momentData = require('moment/locale/ja');
            break;
        case 'ko':
            TRANSLATIONS.ko = require('assets/i18n/ko.json');
            localeData = require('react-intl/locale-data/ko');
            momentData = require('moment/locale/ko');
            break;
        case 'nl':
            TRANSLATIONS.nl = require('assets/i18n/nl.json');
            localeData = require('react-intl/locale-data/nl');
            momentData = require('moment/locale/nl');
            break;
        case 'pl':
            TRANSLATIONS.pl = require('assets/i18n/pl.json');
            localeData = require('react-intl/locale-data/pl');
            momentData = require('moment/locale/pl');
            break;
        case 'pt-BR':
            TRANSLATIONS[locale] = require('assets/i18n/pt-BR.json');
            localeData = require('react-intl/locale-data/pt');
            momentData = require('moment/locale/pt-br');
            break;
        case 'ro':
            TRANSLATIONS.ro = require('assets/i18n/ro.json');
            localeData = require('react-intl/locale-data/ro');
            momentData = require('moment/locale/ro');
            break;
        case 'ru':
            TRANSLATIONS.ru = require('assets/i18n/ru.json');
            localeData = require('react-intl/locale-data/ru');
            momentData = require('moment/locale/ru');
            break;
        case 'tr':
            TRANSLATIONS.tr = require('assets/i18n/tr.json');
            localeData = require('react-intl/locale-data/tr');
            momentData = require('moment/locale/tr');
            break;
        case 'uk':
            TRANSLATIONS.tr = require('assets/i18n/uk.json');
            localeData = require('react-intl/locale-data/uk');
            momentData = require('moment/locale/uk');
            break;
        case 'zh-CN':
            TRANSLATIONS[locale] = require('assets/i18n/zh-CN.json');
            localeData = require('react-intl/locale-data/zh');
            momentData = require('moment/locale/zh-cn');
            break;
        case 'zh-TW':
            TRANSLATIONS[locale] = require('assets/i18n/zh-TW.json');
            localeData = require('react-intl/locale-data/zh');
            momentData = require('moment/locale/zh-tw');
            break;
        }

        if (localeData) {
            addLocaleData(localeData);
        }

        if (momentData) {
            moment.updateLocale(locale.toLowerCase(), momentData);
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

export function getLocalizedMessage(locale, id) {
    const translations = getTranslations(locale);

    return translations[id] || TRANSLATIONS[DEFAULT_LOCALE][id];
}
