// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'intl';

import de from 'assets/i18n/de.json';
import en from 'assets/i18n/en.json';
import es from 'assets/i18n/es.json';
import fr from 'assets/i18n/fr.json';
import ja from 'assets/i18n/ja.json';
import ko from 'assets/i18n/ko.json';
import nl from 'assets/i18n/nl.json';
import ptBR from 'assets/i18n/pt-BR.json';
import ru from 'assets/i18n/ru.json';
import zhCN from 'assets/i18n/zh-CN.json';
import zhTW from 'assets/i18n/zh-TW.json';

const DEFAULT_LOCALE = 'en';

const TRANSLATIONS = {
    de,
    en,
    es,
    fr,
    ja,
    ko,
    nl,
    ptBR,
    ru,
    zhCN,
    zhTW
};

export function getTranslations(locale) {
    return TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
}
