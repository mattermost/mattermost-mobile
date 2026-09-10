// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import EphemeralStore from '@store/ephemeral_store';

import {
    blendColors,
    changeOpacity,
    getChromeMaterialBlurEffect,
    getGlassTintColor,
    getColorSchemeForBackground,
    getComponents,
    getKeyboardAppearanceFromTheme,
    hexToHue,
    makeStyleSheetFromTheme,
    setThemeDefaults,
    updateThemeIfNeeded,
} from './';

const themes = Preferences.THEMES;

describe('getKeyboardAppearanceFromTheme', () => {
    it('should return "light" keyboard appearance for denim theme', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.denim);
        expect(keyboardAppearance).toBe('light');
    });

    it('should return "light" keyboard appearance for sapphire theme', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.sapphire);
        expect(keyboardAppearance).toBe('light');
    });

    it('should return "dark" keyboard appearance for quartz theme', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.quartz);
        expect(keyboardAppearance).toBe('light');
    });

    it('should return "dark" keyboard appearance for indigo theme', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.indigo);
        expect(keyboardAppearance).toBe('dark');
    });

    it('should return "dark" keyboard appearance for onyx theme', () => {
        const keyboardAppearance = getKeyboardAppearanceFromTheme(themes.onyx);
        expect(keyboardAppearance).toBe('dark');
    });

    it('should return "light" for a light theme', () => {
        const theme = {centerChannelBg: '#ffffff'} as Theme;
        const result = getKeyboardAppearanceFromTheme(theme);
        expect(result).toBe('light');
    });

    it('should return "dark" for a dark theme', () => {
        const theme = {centerChannelBg: '#000000'} as Theme;
        const result = getKeyboardAppearanceFromTheme(theme);
        expect(result).toBe('dark');
    });
});

describe('getColorSchemeForBackground', () => {
    it('should treat denim sidebar as dark chrome', () => {
        expect(getColorSchemeForBackground(themes.denim.sidebarBg)).toBe('dark');
        expect(getColorSchemeForBackground(themes.denim.centerChannelBg)).toBe('light');
    });

    it('should treat quartz sidebar as light chrome', () => {
        expect(getColorSchemeForBackground(themes.quartz.sidebarBg)).toBe('light');
        expect(getColorSchemeForBackground(themes.quartz.centerChannelBg)).toBe('light');
    });

    it('should treat indigo content as dark chrome', () => {
        expect(getColorSchemeForBackground(themes.indigo.sidebarBg)).toBe('dark');
        expect(getColorSchemeForBackground(themes.indigo.centerChannelBg)).toBe('dark');
    });

    it('should treat onyx content as dark chrome', () => {
        expect(getColorSchemeForBackground(themes.onyx.sidebarBg)).toBe('dark');
        expect(getColorSchemeForBackground(themes.onyx.centerChannelBg)).toBe('dark');
    });

    it('should follow custom theme hex colors', () => {
        expect(getColorSchemeForBackground('#f7e7ce')).toBe('light');
        expect(getColorSchemeForBackground('#2a0a4a')).toBe('dark');
        expect(getColorSchemeForBackground('#ffffff')).toBe('light');
        expect(getColorSchemeForBackground('#000000')).toBe('dark');
    });

    it('should default missing colors to dark chrome', () => {
        expect(getColorSchemeForBackground()).toBe('dark');
        expect(getColorSchemeForBackground('')).toBe('dark');
    });
});

describe('getChromeMaterialBlurEffect', () => {
    it('should use dark chrome material on dark custom colors', () => {
        expect(getChromeMaterialBlurEffect('#2a0a4a')).toBe('systemChromeMaterialDark');
        expect(getChromeMaterialBlurEffect(themes.denim.sidebarBg)).toBe('systemChromeMaterialDark');
    });

    it('should use light chrome material on light custom colors', () => {
        expect(getChromeMaterialBlurEffect('#f7e7ce')).toBe('systemChromeMaterialLight');
        expect(getChromeMaterialBlurEffect(themes.quartz.sidebarBg)).toBe('systemChromeMaterialLight');
    });
});

describe('getGlassTintColor', () => {
    it('should lighten dark backdrops', () => {
        expect(getGlassTintColor('#000000')).toBe('#1e1e1e');
        expect(getGlassTintColor(themes.denim.sidebarBg)).not.toBe(themes.denim.sidebarBg);
    });

    it('should darken light backdrops', () => {
        expect(getGlassTintColor('#ffffff')).toBe('#e0e0e0');
        expect(getGlassTintColor(themes.quartz.sidebarBg)).not.toBe(themes.quartz.sidebarBg);
    });

    it('should return undefined without a backdrop', () => {
        expect(getGlassTintColor()).toBeUndefined();
    });
});

describe('getComponents', () => {
    it('should return the correct components for an RGB color', () => {
        const color = 'rgb(255,0,0)';
        const result = getComponents(color);
        expect(result).toEqual({red: 255, green: 0, blue: 0, alpha: 1});
    });

    it('should return the correct components for an RGBA color', () => {
        const color = 'rgba(255,0,0,0.5)';
        const result = getComponents(color);
        expect(result).toEqual({red: 255, green: 0, blue: 0, alpha: 0.5});
    });

    it('should return the correct components for a hex color', () => {
        const color = '#ff0000';
        const result = getComponents(color);
        expect(result).toEqual({red: 255, green: 0, blue: 0, alpha: 1});
    });

    it('should return the correct components for a short hex color', () => {
        const color = '#f00';
        const result = getComponents(color);
        expect(result).toEqual({red: 255, green: 0, blue: 0, alpha: 1});
    });
});

describe('makeStyleSheetFromTheme', () => {
    it('should create a style sheet from the theme', () => {
        const theme = {centerChannelBg: '#ffffff'} as Theme;
        const getStyleFromTheme = jest.fn().mockReturnValue({container: {backgroundColor: theme.centerChannelBg}});
        const makeStyleSheet = makeStyleSheetFromTheme(getStyleFromTheme);
        const style = makeStyleSheet(theme);
        expect(style).toEqual({container: {backgroundColor: theme.centerChannelBg}});
    });

    it('should return the same style sheet if the theme has not changed', () => {
        const theme = {centerChannelBg: '#ffffff'} as Theme;
        const getStyleFromTheme = jest.fn().mockReturnValue({container: {backgroundColor: theme.centerChannelBg}});
        const makeStyleSheet = makeStyleSheetFromTheme(getStyleFromTheme);
        const style1 = makeStyleSheet(theme);
        const style2 = makeStyleSheet(theme);
        expect(style1).toBe(style2);
    });
});

describe('changeOpacity', () => {
    it('should change the opacity of a color', () => {
        const color = 'rgba(255,0,0,1)';
        const opacity = 0.5;
        const result = changeOpacity(color, opacity);
        expect(result).toBe('rgba(255,0,0,0.5)');
    });
});

describe('hexToHue', () => {
    it('should return the correct hue for a hex color - all red', () => {
        const color = '#ff0000';
        const result = hexToHue(color);
        expect(result).toBe(0);
    });

    it('should return the correct hue for a hex color - white', () => {
        const color = '#ffffff';
        const result = hexToHue(color);
        expect(result).toBe(0);
    });

    it('should return the correct hue for a hex color - all green', () => {
        const color = '#0000ff';
        const result = hexToHue(color);
        expect(result).toBe(240);
    });

    it('should return the correct hue for a hex color - all blue', () => {
        const color = '#00ff00';
        const result = hexToHue(color);
        expect(result).toBe(120);
    });
});

describe('blendColors', () => {
    it('should blend two colors', () => {
        const background = '#ff0000';
        const foreground = '#0000ff';
        const opacity = 0.5;
        const result = blendColors(background, foreground, opacity);
        expect(result).toBe('rgba(127,0,127,1)');
    });

    it('should blend two colors and return hex', () => {
        const background = '#ff0000';
        const foreground = '#0000ff';
        const opacity = 0.5;
        const result = blendColors(background, foreground, opacity, true);
        expect(result).toBe('#7f007f');
    });
});

describe('setThemeDefaults', () => {
    it('should set theme defaults', () => {
        const theme = {sidebarBg: '#000000'} as ExtendedTheme;
        const result = setThemeDefaults(theme);
        expect(result.sidebarBg).toBe('#000000');
        expect(result.centerChannelBg).toBeDefined();
    });

    it('should return the source theme object if it is a system theme', () => {
        const theme = {type: 'Denim'} as ExtendedTheme;
        const result = setThemeDefaults(theme);
        expect(result).toBe(Preferences.THEMES.denim);
    });
});

describe('updateThemeIfNeeded', () => {
    it('should update the theme if it is different from the stored theme', () => {
        const theme = {sidebarBg: '#000000'} as Theme;
        EphemeralStore.setTheme({sidebarBg: '#ffffff'} as Theme);
        updateThemeIfNeeded(theme);
        expect(EphemeralStore.getTheme()).toBe(theme);
    });

    it('should not update the theme if it is the same as the stored theme', () => {
        const theme = {sidebarBg: '#000000'} as Theme;
        EphemeralStore.setTheme(theme);
        updateThemeIfNeeded(theme);
        expect(EphemeralStore.getTheme()).toBe(theme);
    });
});
