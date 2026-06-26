// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ButtonMarkdownText from './button_markdown_text';

describe('ButtonMarkdownText', () => {
    const theme = Preferences.THEMES.denim;
    const baseStyle = {color: theme.centerChannelColor, fontSize: 15};

    it('should render plain text', () => {
        const {getByText} = renderWithIntlAndTheme(
            <ButtonMarkdownText
                value='Approve'
                baseStyle={baseStyle}
                theme={theme}
                maxNodes={1000}
            />,
        );

        expect(getByText('Approve')).toBeTruthy();
    });

    it('should render bold markdown', () => {
        const {getByText} = renderWithIntlAndTheme(
            <ButtonMarkdownText
                value='**Approve**'
                baseStyle={baseStyle}
                theme={theme}
                maxNodes={1000}
            />,
        );

        expect(getByText('Approve')).toBeTruthy();
    });

    it('should render link text without making it a link', () => {
        const {getByText} = renderWithIntlAndTheme(
            <ButtonMarkdownText
                value='[Docs](https://example.com)'
                baseStyle={baseStyle}
                theme={theme}
                maxNodes={1000}
            />,
        );

        expect(getByText('Docs')).toBeTruthy();
    });
});
