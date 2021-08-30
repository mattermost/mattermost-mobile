// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import {getKeyboardAppearanceFromTheme} from '@utils/theme';

const themes = Preferences.THEMES;

describe('getKeyboardAppearanceFromTheme', () => {
    it('should return "light" keyboard appearance for centerChannelBg="#ffffff"', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.denim);
        expect(keyboardAppearance).toBe('light');
    });

    it('should return "light" keyboard appearance for centerChannelBg="#ffffff"', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.sapphire);
        expect(keyboardAppearance).toBe('light');
    });

    it('should return "dark" keyboard appearance for centerChannelBg="#ffffff"', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.quartz);
        expect(keyboardAppearance).toBe('light');
    });

    it('should return "dark" keyboard appearance for centerChannelBg="#0a111f"', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.indigo);
        expect(keyboardAppearance).toBe('dark');
    });

    it('should return "dark" keyboard appearance for centerChannelBg="#090a0b"', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.onyx);
        expect(keyboardAppearance).toBe('dark');
    });
});
