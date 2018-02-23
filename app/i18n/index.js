// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'intl';
import {addLocaleData} from 'react-intl';
import deLocaleData from 'react-intl/locale-data/de';
import enLocaleData from 'react-intl/locale-data/en';
import esLocaleData from 'react-intl/locale-data/es';
import frLocaleData from 'react-intl/locale-data/fr';
import itLocaleData from 'react-intl/locale-data/it';
import jaLocaleData from 'react-intl/locale-data/ja';
import koLocaleData from 'react-intl/locale-data/ko';
import nlLocaleData from 'react-intl/locale-data/nl';
import plLocaleData from 'react-intl/locale-data/pl';
import ptLocaleData from 'react-intl/locale-data/pt';
import trLocaleData from 'react-intl/locale-data/tr';
import ruLocaleData from 'react-intl/locale-data/ru';
import zhLocaleData from 'react-intl/locale-data/zh';

import de from 'assets/i18n/de.json';
import en from 'assets/i18n/en.json';
import es from 'assets/i18n/es.json';
import fr from 'assets/i18n/fr.json';
import it from 'assets/i18n/it.json';
import ja from 'assets/i18n/ja.json';
import ko from 'assets/i18n/ko.json';
import nl from 'assets/i18n/nl.json';
import pl from 'assets/i18n/pl.json';
import ptBR from 'assets/i18n/pt-BR.json';
import tr from 'assets/i18n/tr.json';
import ru from 'assets/i18n/ru.json';
import zhCN from 'assets/i18n/zh-CN.json';
import zhTW from 'assets/i18n/zh-TW.json';

export const DEFAULT_LOCALE = 'en';

const TRANSLATIONS = {
    de,
    en,
    es,
    fr,
    it,
    ja,
    ko,
    nl,
    pl,
    'pt-BR': ptBR,
    tr,
    ru,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
};

addLocaleData(deLocaleData);
addLocaleData(enLocaleData);
addLocaleData(esLocaleData);
addLocaleData(frLocaleData);
addLocaleData(itLocaleData);
addLocaleData(jaLocaleData);
addLocaleData(koLocaleData);
addLocaleData(nlLocaleData);
addLocaleData(plLocaleData);
addLocaleData(ptLocaleData);
addLocaleData(trLocaleData);
addLocaleData(ruLocaleData);
addLocaleData(zhLocaleData);

export function getTranslations(locale) {
    return TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
}
