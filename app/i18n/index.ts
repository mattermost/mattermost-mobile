// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import {getLocales} from 'react-native-localize';
import 'moment/min/locales';

import en from '@assets/i18n/en.json';
import {logError} from '@utils/log';

import availableLanguages from './languages';

const deviceLocale = getLocales()[0].languageTag;
const PRIMARY_LOCALE = 'en';
export const DEFAULT_LOCALE = getLocaleFromLanguage(deviceLocale);

function loadTranslation(locale?: string): {[x: string]: string} {
    try {
        let translations: {[x: string]: string};

        switch (locale) {
            case 'bg':
                require('@formatjs/intl-pluralrules/locale-data/bg');
                require('@formatjs/intl-numberformat/locale-data/bg');
                require('@formatjs/intl-datetimeformat/locale-data/bg');
                require('@formatjs/intl-listformat/locale-data/bg');

                translations = require('@assets/i18n/bg.json');
                break;
            case 'de':
                require('@formatjs/intl-pluralrules/locale-data/de');
                require('@formatjs/intl-numberformat/locale-data/de');
                require('@formatjs/intl-datetimeformat/locale-data/de');
                require('@formatjs/intl-listformat/locale-data/de');

                translations = require('@assets/i18n/de.json');
                break;
            case 'en-AU':
                require('@formatjs/intl-pluralrules/locale-data/en');
                require('@formatjs/intl-numberformat/locale-data/en');
                require('@formatjs/intl-datetimeformat/locale-data/en');
                require('@formatjs/intl-listformat/locale-data/en');

                translations = require('@assets/i18n/en_AU.json');
                break;
            case 'es':
                require('@formatjs/intl-pluralrules/locale-data/es');
                require('@formatjs/intl-numberformat/locale-data/es');
                require('@formatjs/intl-datetimeformat/locale-data/es');
                require('@formatjs/intl-listformat/locale-data/es');

                translations = require('@assets/i18n/es.json');
                break;
            case 'fa':
                require('@formatjs/intl-pluralrules/locale-data/fa');
                require('@formatjs/intl-numberformat/locale-data/fa');
                require('@formatjs/intl-datetimeformat/locale-data/fa');
                require('@formatjs/intl-listformat/locale-data/fa');

                translations = require('@assets/i18n/fa.json');
                break;
            case 'fr':
                require('@formatjs/intl-pluralrules/locale-data/fr');
                require('@formatjs/intl-numberformat/locale-data/fr');
                require('@formatjs/intl-datetimeformat/locale-data/fr');
                require('@formatjs/intl-listformat/locale-data/fr');

                translations = require('@assets/i18n/fr.json');
                break;
            case 'hu':
                require('@formatjs/intl-pluralrules/locale-data/hu');
                require('@formatjs/intl-numberformat/locale-data/hu');
                require('@formatjs/intl-datetimeformat/locale-data/hu');
                require('@formatjs/intl-listformat/locale-data/hu');

                translations = require('@assets/i18n/hu.json');
                break;
            case 'it':
                require('@formatjs/intl-pluralrules/locale-data/it');
                require('@formatjs/intl-numberformat/locale-data/it');
                require('@formatjs/intl-datetimeformat/locale-data/it');
                require('@formatjs/intl-listformat/locale-data/it');

                translations = require('@assets/i18n/it.json');
                break;
            case 'ja':
                require('@formatjs/intl-pluralrules/locale-data/ja');
                require('@formatjs/intl-numberformat/locale-data/ja');
                require('@formatjs/intl-datetimeformat/locale-data/ja');
                require('@formatjs/intl-listformat/locale-data/ja');

                translations = require('@assets/i18n/ja.json');
                break;
            case 'ko':
                require('@formatjs/intl-pluralrules/locale-data/ko');
                require('@formatjs/intl-numberformat/locale-data/ko');
                require('@formatjs/intl-datetimeformat/locale-data/ko');
                require('@formatjs/intl-listformat/locale-data/ko');

                translations = require('@assets/i18n/ko.json');
                break;
            case 'nl':
                require('@formatjs/intl-pluralrules/locale-data/nl');
                require('@formatjs/intl-numberformat/locale-data/nl');
                require('@formatjs/intl-datetimeformat/locale-data/nl');
                require('@formatjs/intl-listformat/locale-data/nl');

                translations = require('@assets/i18n/nl.json');
                break;
            case 'pl':
                require('@formatjs/intl-pluralrules/locale-data/pl');
                require('@formatjs/intl-numberformat/locale-data/pl');
                require('@formatjs/intl-datetimeformat/locale-data/pl');
                require('@formatjs/intl-listformat/locale-data/pl');

                translations = require('@assets/i18n/pl.json');
                break;
            case 'pt-BR':
                require('@formatjs/intl-pluralrules/locale-data/pt');
                require('@formatjs/intl-numberformat/locale-data/pt');
                require('@formatjs/intl-datetimeformat/locale-data/pt');
                require('@formatjs/intl-listformat/locale-data/pt');

                translations = require('@assets/i18n/pt-BR.json');
                break;
            case 'ro':
                require('@formatjs/intl-pluralrules/locale-data/ro');
                require('@formatjs/intl-numberformat/locale-data/ro');
                require('@formatjs/intl-datetimeformat/locale-data/ro');
                require('@formatjs/intl-listformat/locale-data/ro');

                translations = require('@assets/i18n/ro.json');
                break;
            case 'ru':
                require('@formatjs/intl-pluralrules/locale-data/ru');
                require('@formatjs/intl-numberformat/locale-data/ru');
                require('@formatjs/intl-datetimeformat/locale-data/ru');
                require('@formatjs/intl-listformat/locale-data/ru');

                translations = require('@assets/i18n/ru.json');
                break;
            case 'sv':
                require('@formatjs/intl-pluralrules/locale-data/sv');
                require('@formatjs/intl-numberformat/locale-data/sv');
                require('@formatjs/intl-datetimeformat/locale-data/sv');
                require('@formatjs/intl-listformat/locale-data/sv');

                translations = require('@assets/i18n/sv.json');
                break;
            case 'tr':
                require('@formatjs/intl-pluralrules/locale-data/tr');
                require('@formatjs/intl-numberformat/locale-data/tr');
                require('@formatjs/intl-datetimeformat/locale-data/tr');
                require('@formatjs/intl-listformat/locale-data/tr');

                translations = require('@assets/i18n/tr.json');
                break;
            case 'uk':
                require('@formatjs/intl-pluralrules/locale-data/uk');
                require('@formatjs/intl-numberformat/locale-data/uk');
                require('@formatjs/intl-datetimeformat/locale-data/uk');
                require('@formatjs/intl-listformat/locale-data/uk');

                translations = require('@assets/i18n/uk.json');
                break;
            case 'vi':
                require('@formatjs/intl-pluralrules/locale-data/vi');
                require('@formatjs/intl-numberformat/locale-data/vi');
                require('@formatjs/intl-datetimeformat/locale-data/vi');
                require('@formatjs/intl-listformat/locale-data/vi');

                translations = require('@assets/i18n/vi.json');
                break;
            case 'zh-CN':
                loadChinesePolyfills();
                translations = require('@assets/i18n/zh-CN.json');
                break;
            case 'zh-TW':
                loadChinesePolyfills();
                translations = require('@assets/i18n/zh-TW.json');
                break;
            default:
                require('@formatjs/intl-pluralrules/locale-data/en');
                require('@formatjs/intl-numberformat/locale-data/en');
                require('@formatjs/intl-datetimeformat/locale-data/en');
                require('@formatjs/intl-listformat/locale-data/en');

                translations = en;
                break;
        }

        return translations;
    } catch (e) {
        logError('NO Translation found', e);
        return en;
    }
}

function loadChinesePolyfills() {
    require('@formatjs/intl-pluralrules/locale-data/zh');
    require('@formatjs/intl-numberformat/locale-data/zh');
    require('@formatjs/intl-datetimeformat/locale-data/zh');
    require('@formatjs/intl-listformat/locale-data/zh');
}

export function getLocaleFromLanguage(lang: string) {
    const languageCode = lang.split('-')[0];
    const locale = availableLanguages[lang] || availableLanguages[languageCode] || PRIMARY_LOCALE;
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
