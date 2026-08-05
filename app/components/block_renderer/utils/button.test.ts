// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isMmButtonHexColor, isMmButtonSemanticStyle, parseMmButtonStyle, resolveMmButtonColors} from './button';

const theme = {
    buttonBg: '#145dbf',
    buttonColor: '#ffffff',
    centerChannelColor: '#3f4350',
    errorTextColor: '#d24b4e',
    onlineIndicator: '#06d6a0',
} as Theme;

describe('parseMmButtonStyle', () => {
    it('should return undefined when style is omitted', () => {
        expect(parseMmButtonStyle(undefined)).toBeUndefined();
    });

    it('should preserve semantic attachment styles', () => {
        expect(parseMmButtonStyle('good')).toBe('good');
        expect(parseMmButtonStyle('success')).toBe('success');
        expect(parseMmButtonStyle('warning')).toBe('warning');
        expect(parseMmButtonStyle('primary')).toBe('primary');
        expect(parseMmButtonStyle('danger')).toBe('danger');
        expect(parseMmButtonStyle('default')).toBe('default');
    });

    it('should preserve hex colors', () => {
        expect(parseMmButtonStyle('#2d81ff')).toBe('#2d81ff');
        expect(parseMmButtonStyle('#abc')).toBe('#abc');
    });

    it('should return undefined for invalid values', () => {
        expect(parseMmButtonStyle('onlineIndicator')).toBeUndefined();
        expect(parseMmButtonStyle('#wrong')).toBeUndefined();
    });
});

describe('isMmButtonSemanticStyle', () => {
    it('should identify semantic styles only', () => {
        expect(isMmButtonSemanticStyle('warning')).toBe(true);
        expect(isMmButtonSemanticStyle('#28a745')).toBe(false);
    });
});

describe('isMmButtonHexColor', () => {
    it('should identify hex colors only', () => {
        expect(isMmButtonHexColor('#28a745')).toBe(true);
        expect(isMmButtonHexColor('good')).toBe(false);
    });
});

describe('resolveMmButtonColors', () => {
    it('should use theme button bg for default style (btn-tertiary)', () => {
        const colors = resolveMmButtonColors(undefined, theme);
        expect(colors.color).toBe(theme.buttonBg);
        expect(colors.backgroundColor).toBe('rgba(20,93,191,0.08)');
    });

    it('should use solid button bg for primary style', () => {
        const colors = resolveMmButtonColors('primary', theme);
        expect(colors).toEqual({
            backgroundColor: theme.buttonBg,
            color: theme.buttonColor,
        });
    });

    it('should use web good color for good style', () => {
        const colors = resolveMmButtonColors('good', theme);
        expect(colors.color).toBe('#339970');
    });
});
