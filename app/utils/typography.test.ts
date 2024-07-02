// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {typography, type FontSizes, type FontStyles, type FontTypes} from './typography';

describe('Typography', () => {
    const testCases: Array<[FontTypes, FontSizes, FontStyles | undefined, string]> = [
        ['Heading', 1200, 'SemiBold', 'Metropolis-SemiBold'],
        ['Heading', 1000, 'Regular', 'Metropolis'],
        ['Heading', 900, 'Regular', 'Metropolis'],
        ['Heading', 800, 'Light', 'Metropolis-Light'],
        ['Heading', 700, 'Regular', 'Metropolis'],
        ['Heading', 600, 'Regular', 'Metropolis'],
        ['Heading', 600, undefined, 'Metropolis-SemiBold'],
        ['Body', 500, 'Regular', 'OpenSans'],
        ['Body', 400, 'Regular', 'OpenSans'],
        ['Body', 300, 'Light', 'OpenSans-Light'],
        ['Body', 200, 'SemiBold', 'OpenSans-SemiBold'],
        ['Body', 100, 'Light', 'OpenSans-Light'],
        ['Body', 75, 'Regular', 'OpenSans'],
        ['Body', 50, 'Regular', 'OpenSans'],
        ['Body', 25, 'Light', 'OpenSans-Light'],
        ['Body', 25, undefined, 'OpenSans'],
    ];

    testCases.forEach(([type, size, style, expectedFontFamily]) => {
        it(`returns correct typography for type: ${type}, size: ${size}, style: ${style}`, () => {
            const result = typography(type, size, style);
            expect(result).toBeDefined();
            expect(result.fontFamily).toBe(expectedFontFamily);

            switch (size) {
                case 1200:
                    expect(result.fontSize).toBe(66);
                    expect(result.lineHeight).toBe(48);
                    expect(result.letterSpacing).toBe(-0.02);
                    break;
                case 1000:
                    expect(result.fontSize).toBe(40);
                    expect(result.lineHeight).toBe(48);
                    expect(result.letterSpacing).toBe(-0.02);
                    break;
                case 900:
                    expect(result.fontSize).toBe(36);
                    expect(result.lineHeight).toBe(44);
                    expect(result.letterSpacing).toBe(-0.02);
                    break;
                case 800:
                    expect(result.fontSize).toBe(32);
                    expect(result.lineHeight).toBe(40);
                    expect(result.letterSpacing).toBe(-0.01);
                    break;
                case 700:
                    expect(result.fontSize).toBe(28);
                    expect(result.lineHeight).toBe(36);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 600:
                    expect(result.fontSize).toBe(25);
                    expect(result.lineHeight).toBe(30);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 500:
                    expect(result.fontSize).toBe(22);
                    expect(result.lineHeight).toBe(28);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 400:
                    expect(result.fontSize).toBe(20);
                    expect(result.lineHeight).toBe(28);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 300:
                    expect(result.fontSize).toBe(18);
                    expect(result.lineHeight).toBe(24);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 200:
                    expect(result.fontSize).toBe(16);
                    expect(result.lineHeight).toBe(24);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 100:
                    expect(result.fontSize).toBe(14);
                    expect(result.lineHeight).toBe(20);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 75:
                    expect(result.fontSize).toBe(12);
                    expect(result.lineHeight).toBe(16);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 50:
                    expect(result.fontSize).toBe(11);
                    expect(result.lineHeight).toBe(16);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                case 25:
                    expect(result.fontSize).toBe(10);
                    expect(result.lineHeight).toBe(16);
                    expect(result.letterSpacing).toBeUndefined();
                    break;
                default:
                    throw new Error(`Unexpected font size: ${size}`);
            }

            switch (style) {
                case 'SemiBold':
                    expect(result.fontWeight).toBe('600');
                    break;
                case 'Regular':
                    expect(result.fontWeight).toBe('400');
                    break;
                case 'Light':
                    expect(result.fontWeight).toBe('300');
                    break;
                default:
                    if (type === 'Heading') {
                        expect(result.fontWeight).toBe('600');
                    } else {
                        expect(result.fontWeight).toBe('400');
                    }
            }
        });
    });
});
