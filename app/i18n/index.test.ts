// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import {getLocales} from 'react-native-localize';

import en from '@assets/i18n/en.json';
import * as logUtils from '@utils/log';

import {
    getLocaleFromLanguage,
    resetMomentLocale,
    getTranslations,
    getLocalizedMessage,
    DEFAULT_LOCALE,
} from './index';

jest.mock('react-native-localize', () => ({
    getLocales: jest.fn().mockReturnValue([{languageTag: 'en'}]),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

jest.mock('@assets/i18n/en.json', () => ({test: 'Test', hello: 'Hello'}));
jest.mock('@assets/i18n/bg.json', () => ({test: 'Тест', hello: 'Здравейте'}));
jest.mock('@assets/i18n/de.json', () => ({test: 'Test', hello: 'Hallo'}));
jest.mock('@assets/i18n/en_AU.json', () => ({test: 'Test', hello: 'G\'day'}));
jest.mock('@assets/i18n/es.json', () => ({test: 'Prueba', hello: 'Hola'}));
jest.mock('@assets/i18n/fa.json', () => ({test: 'تست', hello: 'سلام'}));
jest.mock('@assets/i18n/fr.json', () => ({test: 'Test', hello: 'Bonjour'}));
jest.mock('@assets/i18n/hu.json', () => ({test: 'Teszt', hello: 'Helló'}));
jest.mock('@assets/i18n/it.json', () => ({test: 'Test', hello: 'Ciao'}));
jest.mock('@assets/i18n/ja.json', () => ({test: 'テスト', hello: 'こんにちは'}));
jest.mock('@assets/i18n/ko.json', () => ({test: '테스트', hello: '안녕하세요'}));
jest.mock('@assets/i18n/nl.json', () => ({test: 'Test', hello: 'Hallo'}));
jest.mock('@assets/i18n/pl.json', () => ({test: 'Test', hello: 'Cześć'}));
jest.mock('@assets/i18n/pt-BR.json', () => ({test: 'Teste', hello: 'Olá'}));
jest.mock('@assets/i18n/ro.json', () => ({test: 'Test', hello: 'Bună'}));
jest.mock('@assets/i18n/ru.json', () => ({test: 'Тест', hello: 'Привет'}));
jest.mock('@assets/i18n/sv.json', () => ({test: 'Test', hello: 'Hej'}));
jest.mock('@assets/i18n/tr.json', () => ({test: 'Test', hello: 'Merhaba'}));
jest.mock('@assets/i18n/uk.json', () => ({test: 'Тест', hello: 'Привіт'}));
jest.mock('@assets/i18n/vi.json', () => ({test: 'Kiểm tra', hello: 'Xin chào'}));
jest.mock('@assets/i18n/zh-CN.json', () => ({test: '测试', hello: '你好'}));
jest.mock('@assets/i18n/zh-TW.json', () => ({test: '測試', hello: '你好'}));

describe('i18n', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getLocales).mockReturnValue([{
            languageTag: 'en',
            languageCode: '',
            countryCode: '',
            isRTL: false,
        }]);
    });

    describe('getLocaleFromLanguage', () => {
        it('returns correct locale for full language code', () => {
            expect(getLocaleFromLanguage('es-ES')).toBe('es');
            expect(getLocaleFromLanguage('pt-BR')).toBe('pt-BR');
            expect(getLocaleFromLanguage('zh-TW')).toBe('zh-TW');
            expect(getLocaleFromLanguage('zh-CN')).toBe('zh-CN');
            expect(getLocaleFromLanguage('en-AU')).toBe('en-AU');
        });

        it('returns correct locale for language code', () => {
            expect(getLocaleFromLanguage('es')).toBe('es');
            expect(getLocaleFromLanguage('en')).toBe('en');
            expect(getLocaleFromLanguage('fr')).toBe('fr');
            expect(getLocaleFromLanguage('de')).toBe('de');
            expect(getLocaleFromLanguage('ja')).toBe('ja');
        });

        it('returns default locale for unsupported language', () => {
            expect(getLocaleFromLanguage('xx')).toBe('en');
            expect(getLocaleFromLanguage('')).toBe('en');
            expect(getLocaleFromLanguage('not-valid')).toBe('en');
        });
    });

    describe('resetMomentLocale', () => {
        let spy: jest.SpyInstance;

        beforeEach(() => {
            spy = jest.spyOn(moment, 'locale');
        });

        afterEach(() => {
            spy.mockRestore();
        });

        it('sets moment locale correctly for various languages', () => {
            resetMomentLocale('es-ES');
            expect(spy).toHaveBeenCalledWith('es');

            resetMomentLocale('en');
            expect(spy).toHaveBeenCalledWith('en');

            resetMomentLocale('zh-TW');
            expect(spy).toHaveBeenCalledWith('zh');

            resetMomentLocale('pt-BR');
            expect(spy).toHaveBeenCalledWith('pt');
        });

        it('uses default locale when no locale provided', () => {
            resetMomentLocale();
            expect(spy).toHaveBeenCalledWith(DEFAULT_LOCALE.split('-')[0]);
        });

        it('handles invalid locales gracefully', () => {
            resetMomentLocale('invalid-locale');
            expect(spy).toHaveBeenCalledWith('invalid');

            resetMomentLocale('');
            expect(spy).toHaveBeenCalledWith(DEFAULT_LOCALE.split('-')[0]);
        });
    });

    describe('getTranslations', () => {
        beforeEach(() => {
            (logUtils.logError as jest.Mock).mockClear();
        });

        it('returns correct translations for all supported locales', () => {
            const testCases = [
                {locale: 'bg', hello: 'Здравейте', test: 'Тест'},
                {locale: 'de', hello: 'Hallo', test: 'Test'},
                {locale: 'en', hello: 'Hello', test: 'Test'},
                {locale: 'en-AU', hello: 'G\'day', test: 'Test'},
                {locale: 'es', hello: 'Hola', test: 'Prueba'},
                {locale: 'fa', hello: 'سلام', test: 'تست'},
                {locale: 'fr', hello: 'Bonjour', test: 'Test'},
                {locale: 'hu', hello: 'Helló', test: 'Teszt'},
                {locale: 'it', hello: 'Ciao', test: 'Test'},
                {locale: 'ja', hello: 'こんにちは', test: 'テスト'},
                {locale: 'ko', hello: '안녕하세요', test: '테스트'},
                {locale: 'nl', hello: 'Hallo', test: 'Test'},
                {locale: 'pl', hello: 'Cześć', test: 'Test'},
                {locale: 'pt-BR', hello: 'Olá', test: 'Teste'},
                {locale: 'ro', hello: 'Bună', test: 'Test'},
                {locale: 'ru', hello: 'Привет', test: 'Тест'},
                {locale: 'sv', hello: 'Hej', test: 'Test'},
                {locale: 'tr', hello: 'Merhaba', test: 'Test'},
                {locale: 'uk', hello: 'Привіт', test: 'Тест'},
                {locale: 'vi', hello: 'Xin chào', test: 'Kiểm tra'},
                {locale: 'zh-CN', hello: '你好', test: '测试'},
                {locale: 'zh-TW', hello: '你好', test: '測試'},
            ];

            testCases.forEach(({locale, hello, test: testWord}) => {
                const translations = getTranslations(locale);
                expect(translations.hello).toBe(hello);
                expect(translations.test).toBe(testWord);
            });
        });

        it('returns english translations for unsupported locale', () => {
            const translations = getTranslations('xx');
            expect(translations).toEqual(en);
            expect(logUtils.logError).not.toHaveBeenCalled();
        });

        it('loads correct polyfills for Chinese locales', () => {
            const zhCNTranslations = getTranslations('zh-CN');
            expect(zhCNTranslations.hello).toBe('你好');
            expect(zhCNTranslations.test).toBe('测试');

            const zhTWTranslations = getTranslations('zh-TW');
            expect(zhTWTranslations.hello).toBe('你好');
            expect(zhTWTranslations.test).toBe('測試');
        });
    });

    describe('getLocalizedMessage', () => {
        it('returns correct message for existing key in various languages', () => {
            expect(getLocalizedMessage('en', 'test')).toBe('Test');
            expect(getLocalizedMessage('es', 'test')).toBe('Prueba');
            expect(getLocalizedMessage('en', 'hello')).toBe('Hello');
            expect(getLocalizedMessage('es', 'hello')).toBe('Hola');
        });

        it('returns default message when key not found', () => {
            expect(getLocalizedMessage('en', 'nonexistent', 'Default')).toBe('Default');
            expect(getLocalizedMessage('es', 'nonexistent', 'Por defecto')).toBe('Por defecto');
        });

        it('returns empty string when no translation or default', () => {
            expect(getLocalizedMessage('en', 'nonexistent')).toBe('');
            expect(getLocalizedMessage('es', 'nonexistent')).toBe('');
        });

        it('handles invalid inputs gracefully', () => {
            expect(getLocalizedMessage('', 'test')).toBe('Test');
            expect(getLocalizedMessage('invalid-locale', 'test')).toBe('Test');
            expect(getLocalizedMessage('en', '')).toBe('');
            expect(getLocalizedMessage('en', undefined as unknown as string)).toBe('');
            expect(getLocalizedMessage('en', null as unknown as string)).toBe('');
        });
    });
});
