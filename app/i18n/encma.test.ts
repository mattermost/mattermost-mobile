// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getLocalizedMessage, getTranslations} from './index';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

describe('ENCMA translation branding', () => {
    it('replaces visible product names while preserving legal attribution', () => {
        const translations = getTranslations('en');

        expect(translations['onboaring.welcome_description']).toContain('ENCMA is a sovereign collaboration platform');
        expect(translations['rate.title']).toBe('Enjoying ENCMA?');
        expect(translations['mobile.calls.foreground_service.channel_name']).toBe('ENCMA Calls');
        expect(translations['settings.about.copyright']).toContain('Mattermost, Inc.');
        expect(translations['settings.notice_text']).toContain('Mattermost is made possible');
    });

    it('retains localized wording when the product name can be replaced directly', () => {
        const translations = getTranslations('de');

        expect(translations['onboaring.welcome_description']).toContain('ENCMA ist eine Open-Source-Plattform');
        expect(translations['onboaring.welcome_description']).not.toContain('Mattermost');
        expect(translations['settings.about.copyright']).toContain('Mattermost, Inc.');
    });

    it('uses branded English copy for locales that transliterate the old name', () => {
        const translations = getTranslations('fa');

        expect(translations['rate.title']).toBe('Enjoying ENCMA?');
        expect(translations['onboaring.welcome_description']).toContain('ENCMA is a sovereign collaboration platform');
    });

    it('brands localized native and alert fallbacks', () => {
        expect(getLocalizedMessage('en', 'mobile.calls.foreground_service.title')).toBe('ENCMA');
        expect(getLocalizedMessage('en', 'mobile.managed.not_secured.android')).toContain('to use ENCMA.');
    });
});
