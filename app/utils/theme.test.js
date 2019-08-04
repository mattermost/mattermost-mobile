// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getHighlightStyleFromTheme} from 'app/utils/theme';
import * as HighlightStyles from 'react-syntax-highlighter/styles/hljs';

describe('getHighlightStyleFromTheme', () => {
    const themes = [{
        codeTheme: 'github',
    }, {
        codeTheme: 'atom-one-light',
    }, {
        codeTheme: 'androidstudio',
    }, {
        codeTheme: 'invalid_theme',
    }];

    it('should return github style for codeTheme="github"', () => {
        const theme = getHighlightStyleFromTheme(themes[0]);
        expect(theme).toBeTruthy();
        expect(theme).toBe(HighlightStyles.github);
    });

    it('should return a11yLight style for codeTheme="atom-one-light" (snake-case to camelCase)', () => {
        const theme = getHighlightStyleFromTheme(themes[1]);
        expect(theme).toBeTruthy();
        expect(theme).toBe(HighlightStyles.atomOneLight);
    });

    it('should return androidstudio style for codeTheme="androidstudio" (no case conversion)', () => {
        const theme = getHighlightStyleFromTheme(themes[2]);
        expect(theme).toBeTruthy();
        expect(theme).toBe(HighlightStyles.androidstudio);
    });

    it('should return github style by default for codeTheme="invalid_theme"', () => {
        const theme = getHighlightStyleFromTheme(themes[3]);
        expect(theme).toBeTruthy();
        expect(theme).toBe(HighlightStyles.github);
    });
});
