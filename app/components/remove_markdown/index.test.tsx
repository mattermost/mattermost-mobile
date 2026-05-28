// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type TextStyle, StyleSheet} from 'react-native';

import {Preferences} from '@constants';
import {renderWithIntl, screen} from '@test/intl-test-helper';
import {getMarkdownTextStyles} from '@utils/markdown';

import RemoveMarkdown from '.';

jest.mock('@context/theme', () => {
    const {Preferences: Prefs} = require('@constants');
    return {
        useTheme: () => Prefs.THEMES.denim,
        getDefaultThemeByAppearance: () => Prefs.THEMES.denim,
    };
});

jest.mock('@context/server', () => ({
    useServerUrl: () => 'http://localhost:8065',
}));

jest.mock('./at_mention', () => {
    const {Text} = require('react-native');
    const MockAtMention = ({mentionName, textStyle}: {mentionName: string; textStyle: any}) => (
        <Text
            testID={`at_mention.${mentionName}`}
            style={textStyle}
        >
            {`@${mentionName}`}
        </Text>
    );
    MockAtMention.displayName = 'MockAtMention';
    return MockAtMention;
});

jest.mock('../markdown/channel_mention', () => {
    const {Text} = require('react-native');
    const MockChannelMention = ({channelName, textStyle}: {channelName: string; textStyle: any}) => (
        <Text
            testID={`channel_mention.${channelName}`}
            style={textStyle}
        >
            {`~${channelName}`}
        </Text>
    );
    MockChannelMention.displayName = 'MockChannelMention';
    return MockChannelMention;
});

jest.mock('@components/emoji', () => {
    const {Text} = require('react-native');
    const MockEmoji = ({emojiName, textStyle}: {emojiName: string; textStyle: any}) => (
        <Text
            testID={`emoji.${emojiName}`}
            style={textStyle}
        >
            {`:${emojiName}:`}
        </Text>
    );
    MockEmoji.displayName = 'MockEmoji';
    return MockEmoji;
});

const theme = Preferences.THEMES.denim;
const headingTextStyles = getMarkdownTextStyles(theme);

function getFlatStyle(element: ReturnType<typeof screen.getByTestId>): TextStyle {
    return StyleSheet.flatten(element.props.style) as TextStyle;
}

describe('RemoveMarkdown', () => {
    const baseStyle: TextStyle = {fontSize: 16, color: '#000'};

    describe('heading context stripping for mentions', () => {
        it('should render @mention inside a heading without heading font size', () => {
            renderWithIntl(
                <RemoveMarkdown
                    baseStyle={baseStyle}
                    value='### Hello @channel'
                />,
            );

            const style = getFlatStyle(screen.getByTestId('at_mention.channel'));
            const heading3FontSize = StyleSheet.flatten(headingTextStyles.heading3 as TextStyle).fontSize;
            expect(style.fontSize).not.toBe(heading3FontSize);
            expect(style.fontSize).toBe(baseStyle.fontSize);
        });

        it('should render channel link inside a heading without heading font size', () => {
            renderWithIntl(
                <RemoveMarkdown
                    enableChannelLink={true}
                    baseStyle={baseStyle}
                    value='### Check ~town-square'
                />,
            );

            const style = getFlatStyle(screen.getByTestId('channel_mention.town-square'));
            const heading3FontSize = StyleSheet.flatten(headingTextStyles.heading3 as TextStyle).fontSize;
            expect(style.fontSize).not.toBe(heading3FontSize);
            expect(style.fontSize).toBe(baseStyle.fontSize);
        });

        it('should strip heading styles for all heading levels', () => {
            for (const level of [1, 2, 3, 4, 5, 6]) {
                const hashes = '#'.repeat(level);

                const {unmount} = renderWithIntl(
                    <RemoveMarkdown
                        baseStyle={baseStyle}
                        value={`${hashes} Mention @testuser`}
                    />,
                );

                const style = getFlatStyle(screen.getByTestId('at_mention.testuser'));
                expect(style.fontFamily).not.toBe('Metropolis-SemiBold');
                expect(style.fontSize).toBe(baseStyle.fontSize);

                unmount();
            }
        });
    });

    describe('heading block separation', () => {
        it('should add a newline after heading content', () => {
            const {toJSON} = renderWithIntl(
                <RemoveMarkdown
                    baseStyle={baseStyle}
                    value={'### Heading\nBody text'}
                />,
            );

            const json = JSON.stringify(toJSON());
            const headingIdx = json.indexOf('Heading');
            const newlineIdx = json.indexOf('\\n', headingIdx);
            const bodyIdx = json.indexOf('Body');
            expect(headingIdx).toBeGreaterThan(-1);
            expect(newlineIdx).toBeGreaterThan(headingIdx);
            expect(bodyIdx).toBeGreaterThan(newlineIdx);
        });

        it('should render heading in a View block when separateHeading is set', () => {
            const {toJSON} = renderWithIntl(
                <RemoveMarkdown
                    baseStyle={baseStyle}
                    numberOfLines={2}
                    separateHeading={true}
                    value={'### Heading\nBody text'}
                />,
            );

            const json = JSON.stringify(toJSON());
            expect(json).toContain('Heading');
            expect(json).toContain('Body');
        });
    });

    describe('basic rendering', () => {
        it('should render plain text', () => {
            renderWithIntl(
                <RemoveMarkdown
                    baseStyle={baseStyle}
                    value='Hello world'
                />,
            );

            expect(screen.getByText('Hello world')).toBeTruthy();
        });

        it('should render @mention', () => {
            renderWithIntl(
                <RemoveMarkdown
                    baseStyle={baseStyle}
                    value='Hello @admin'
                />,
            );

            expect(screen.getByTestId('at_mention.admin')).toBeTruthy();
        });

        it('should render code span when enabled', () => {
            renderWithIntl(
                <RemoveMarkdown
                    enableCodeSpan={true}
                    baseStyle={baseStyle}
                    value='Use `code` here'
                />,
            );

            expect(screen.getByTestId('markdown_code_span')).toBeTruthy();
        });
    });
});
