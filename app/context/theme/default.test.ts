// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Appearance} from 'react-native';
import tinycolor from 'tinycolor2';

import {ENCMA_THEME} from '@constants/encma_theme';
import Preferences from '@constants/preferences';

import {getDefaultThemeByAppearance} from './default';

jest.mock('expo-application', () => ({applicationId: 'com.encma.hxmain'}));

describe('ENCMA visual default', () => {
    it('uses the reference palette in both system appearances', () => {
        jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
        expect(getDefaultThemeByAppearance()).toBe(ENCMA_THEME);
        jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
        expect(getDefaultThemeByAppearance()).toBe(ENCMA_THEME);
        jest.restoreAllMocks();
    });

    it('preserves system appearance for non-ENCMA builds', () => {
        const application = require('expo-application');
        application.applicationId = 'com.mattermost.rnbeta';
        try {
            jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
            expect(getDefaultThemeByAppearance()).toBe(Preferences.THEMES.denim);
            jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
            expect(getDefaultThemeByAppearance()).toBe(Preferences.THEMES.onyx);
        } finally {
            application.applicationId = 'com.encma.hxmain';
            jest.restoreAllMocks();
        }
    });

    it('retains upstream themes without mutating them', () => {
        expect(Preferences.THEMES.onyx.centerChannelBg).toBe('#191b1f');
        expect(Preferences.THEMES.denim.centerChannelBg).not.toBe(ENCMA_THEME.centerChannelBg);
    });

    it('keeps body and sidebar text above WCAG AA contrast', () => {
        expect(tinycolor.readability(ENCMA_THEME.centerChannelBg, ENCMA_THEME.centerChannelColor)).toBeGreaterThanOrEqual(4.5);
        expect(tinycolor.readability(ENCMA_THEME.sidebarBg, ENCMA_THEME.sidebarText)).toBeGreaterThanOrEqual(4.5);
        expect(tinycolor.readability(ENCMA_THEME.centerChannelBg, ENCMA_THEME.linkColor)).toBeGreaterThanOrEqual(4.5);
    });
});
