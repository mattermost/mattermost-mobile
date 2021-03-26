// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import 'intl';
import moment from 'moment';

import en from '@assets/i18n/en.json';

export const DEFAULT_LOCALE = 'en';

function loadTranslation(locale: string) {
    try {
        let translations;
        let momentData;
        switch (locale) {
            case 'de':
                translations = require('@assets/i18n/de.json');
                momentData = require('moment/locale/de');
                break;
            case 'es':
                translations = require('@assets/i18n/es.json');
                momentData = require('moment/locale/es');
                break;
            case 'fr':
                translations = require('@assets/i18n/fr.json');
                momentData = require('moment/locale/fr');
                break;
            case 'it':
                translations = require('@assets/i18n/it.json');
                momentData = require('moment/locale/it');
                break;
            case 'ja':
                translations = require('@assets/i18n/ja.json');
                momentData = require('moment/locale/ja');
                break;
            case 'ko':
                translations = require('@assets/i18n/ko.json');
                momentData = require('moment/locale/ko');
                break;
            case 'nl':
                translations = require('@assets/i18n/nl.json');
                momentData = require('moment/locale/nl');
                break;
            case 'pl':
                translations = require('@assets/i18n/pl.json');
                momentData = require('moment/locale/pl');
                break;
            case 'pt-BR':
                translations = require('@assets/i18n/pt-BR.json');
                momentData = require('moment/locale/pt-br');
                break;
            case 'ro':
                translations = require('@assets/i18n/ro.json');
                momentData = require('moment/locale/ro');
                break;
            case 'ru':
                translations = require('@assets/i18n/ru.json');
                momentData = require('moment/locale/ru');
                break;
            case 'tr':
                translations = require('@assets/i18n/tr.json');
                momentData = require('moment/locale/tr');
                break;
            case 'uk':
                translations = require('@assets/i18n/uk.json');
                momentData = require('moment/locale/uk');
                break;
            case 'zh-CN':
                translations = require('@assets/i18n/zh-CN.json');
                momentData = require('moment/locale/zh-cn');
                break;
            case 'zh-TW':
                translations = require('@assets/i18n/zh-TW.json');
                momentData = require('moment/locale/zh-tw');
                break;
            default:
                translations = en;
                break;
        }

        if (momentData) {
            moment.updateLocale(locale.toLowerCase(), momentData);
        } else {
            resetMomentLocale();
        }
        return translations;
    } catch (e) {
        console.error('NO Translation found', e); //eslint-disable-line no-console
        return en;
    }
}

export function resetMomentLocale() {
    moment.locale(DEFAULT_LOCALE);
}

export function getTranslations(locale: string) {
    return loadTranslation(locale);
}

export function getLocalizedMessage(locale: string, id: string) {
    const translations = getTranslations(locale);

    return translations[id];
}

export function t(v: string): string {
    return v;
}
