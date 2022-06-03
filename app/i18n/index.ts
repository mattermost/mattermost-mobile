// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {getLocales} from 'react-native-localize';

import en from '@assets/i18n/en.json';

import availableLanguages from './languages';

const deviceLocale = getLocales()[0].languageTag;
export const DEFAULT_LOCALE = getLocaleFromLanguage(deviceLocale);

function loadTranslation(locale?: string) {
    try {
        let translations: Record<string, string>;
        let momentData;

        switch (locale) {
            case 'de':
                require('@formatjs/intl-pluralrules/locale-data/de');
                require('@formatjs/intl-numberformat/locale-data/de');
                require('@formatjs/intl-datetimeformat/locale-data/de');

                translations = require('@assets/i18n/de.json');
                momentData = require('moment/locale/de');
                break;
            case 'en-AU':
                require('@formatjs/intl-pluralrules/locale-data/en');
                require('@formatjs/intl-numberformat/locale-data/en');
                require('@formatjs/intl-datetimeformat/locale-data/en');

                translations = require('@assets/i18n/en_AU.json');
                momentData = require('moment/locale/en-au');
                break;
            case 'es':
                require('@formatjs/intl-pluralrules/locale-data/es');
                require('@formatjs/intl-numberformat/locale-data/es');
                require('@formatjs/intl-datetimeformat/locale-data/es');

                translations = require('@assets/i18n/es.json');
                momentData = require('moment/locale/es');
                break;
            case 'fr':
                require('@formatjs/intl-pluralrules/locale-data/fr');
                require('@formatjs/intl-numberformat/locale-data/fr');
                require('@formatjs/intl-datetimeformat/locale-data/fr');

                translations = require('@assets/i18n/fr.json');
                momentData = require('moment/locale/fr');
                break;
            case 'it':
                require('@formatjs/intl-pluralrules/locale-data/it');
                require('@formatjs/intl-numberformat/locale-data/it');
                require('@formatjs/intl-datetimeformat/locale-data/it');

                translations = require('@assets/i18n/it.json');
                momentData = require('moment/locale/it');
                break;
            case 'ja':
                require('@formatjs/intl-pluralrules/locale-data/ja');
                require('@formatjs/intl-numberformat/locale-data/ja');
                require('@formatjs/intl-datetimeformat/locale-data/ja');

                translations = require('@assets/i18n/ja.json');
                momentData = require('moment/locale/ja');
                break;
            case 'ko':
                require('@formatjs/intl-pluralrules/locale-data/ko');
                require('@formatjs/intl-numberformat/locale-data/ko');
                require('@formatjs/intl-datetimeformat/locale-data/ko');

                translations = require('@assets/i18n/ko.json');
                momentData = require('moment/locale/ko');
                break;
            case 'nl':
                require('@formatjs/intl-pluralrules/locale-data/nl');
                require('@formatjs/intl-numberformat/locale-data/nl');
                require('@formatjs/intl-datetimeformat/locale-data/nl');

                translations = require('@assets/i18n/nl.json');
                momentData = require('moment/locale/nl');
                break;
            case 'pl':
                require('@formatjs/intl-pluralrules/locale-data/pl');
                require('@formatjs/intl-numberformat/locale-data/pl');
                require('@formatjs/intl-datetimeformat/locale-data/pl');

                translations = require('@assets/i18n/pl.json');
                momentData = require('moment/locale/pl');
                break;
            case 'pt-BR':
                require('@formatjs/intl-pluralrules/locale-data/pt');
                require('@formatjs/intl-numberformat/locale-data/pt');
                require('@formatjs/intl-datetimeformat/locale-data/pt');

                translations = require('@assets/i18n/pt-BR.json');
                momentData = require('moment/locale/pt-br');
                break;
            case 'ro':
                require('@formatjs/intl-pluralrules/locale-data/ro');
                require('@formatjs/intl-numberformat/locale-data/ro');
                require('@formatjs/intl-datetimeformat/locale-data/ro');

                translations = require('@assets/i18n/ro.json');
                momentData = require('moment/locale/ro');
                break;
            case 'ru':
                require('@formatjs/intl-pluralrules/locale-data/ru');
                require('@formatjs/intl-numberformat/locale-data/ru');
                require('@formatjs/intl-datetimeformat/locale-data/ru');

                translations = require('@assets/i18n/ru.json');
                momentData = require('moment/locale/ru');
                break;
            case 'tr':
                require('@formatjs/intl-pluralrules/locale-data/tr');
                require('@formatjs/intl-numberformat/locale-data/tr');
                require('@formatjs/intl-datetimeformat/locale-data/tr');

                translations = require('@assets/i18n/tr.json');
                momentData = require('moment/locale/tr');
                break;
            case 'uk':
                require('@formatjs/intl-pluralrules/locale-data/uk');
                require('@formatjs/intl-numberformat/locale-data/uk');
                require('@formatjs/intl-datetimeformat/locale-data/uk');

                translations = require('@assets/i18n/uk.json');
                momentData = require('moment/locale/uk');
                break;
            case 'zh-CN':
                loadChinesePolyfills();
                translations = require('@assets/i18n/zh-CN.json');
                momentData = require('moment/locale/zh-cn');
                break;
            case 'zh-TW':
                loadChinesePolyfills();
                translations = require('@assets/i18n/zh-TW.json');
                momentData = require('moment/locale/zh-tw');
                break;
            default:
                require('@formatjs/intl-pluralrules/locale-data/en');
                require('@formatjs/intl-numberformat/locale-data/en');
                require('@formatjs/intl-datetimeformat/locale-data/en');

                translations = en;
                break;
        }

        if (momentData && locale) {
            const lang = getLocaleFromLanguage(locale).toLowerCase();
            moment.updateLocale(lang, momentData);
        } else {
            resetMomentLocale();
        }
        return translations;
    } catch (e) {
        console.error('NO Translation found', e); //eslint-disable-line no-console
        return en;
    }
}

function loadChinesePolyfills() {
    require('@formatjs/intl-pluralrules/locale-data/zh');
    require('@formatjs/intl-numberformat/locale-data/zh');
    require('@formatjs/intl-datetimeformat/locale-data/zh');
}

export function getLocaleFromLanguage(lang: string) {
    const languageCode = lang.split('-')[0];
    const locale = availableLanguages[lang] || languageCode;
    return locale;
}

export function resetMomentLocale(locale?: string) {
    moment.locale(locale?.split('-')[0] || DEFAULT_LOCALE.split('-')[0]);
}

export function getTranslations(lang: string) {
    const locale = getLocaleFromLanguage(lang);
    return loadTranslation(locale);
}

export function getLocalizedMessage(lang: string, id: string, defaultMessage?: string) {
    const locale = getLocaleFromLanguage(lang);
    const translations = getTranslations(locale);

    return translations[id] || defaultMessage || '';
}

export function t(v: string): string {
    return v;
}
