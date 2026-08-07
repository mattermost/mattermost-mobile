// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import * as CommonMark from 'commonmark';
const {Node} = CommonMark;
import React from 'react';
import {StyleSheet, Text} from 'react-native';

import {Preferences, Screens} from '@constants';
import ServerUrlProvider from '@context/server';
import {renderWithIntl} from '@test/intl-test-helper';
import {getMarkdownTextStyles} from '@utils/markdown';
import {typography} from '@utils/typography';

import Markdown, {testExports} from './markdown';
import * as Transforms from './transform';

const Parser = jest.requireActual('commonmark').Parser;
const SERVER_URL = 'https://mattermost.example.com/mattermost';
const FILE_ID = 'abcdefghijklmnopqrstuvwxyz';

function MockMarkdownImage({source}: {source: string}) {
    return <Text testID='markdown_image'>{source}</Text>;
}

jest.mock('@screens/navigation', () => ({
    navigateToRoot: jest.fn(),
}));

jest.mock('./markdown_image', () => MockMarkdownImage);

describe('Markdown', () => {
    const baseProps: React.ComponentProps<typeof Markdown> = {
        baseTextStyle: {},
        enableInlineLatex: true,
        enableLatex: true,
        location: Screens.CHANNEL,
        maxNodes: 2000,
        theme: Preferences.THEMES.denim,
    };

    describe('error handling', () => {
        test('should render Markdown normally', () => {
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    value='This is a test'
                />,
            );

            expect(screen.getByText('This is a test')).toBeVisible();
        });

        test('should catch errors when parsing Markdown', () => {
            jest.spyOn(CommonMark, 'Parser').mockImplementation(() => {
                const parser = new Parser();
                parser.incorporateLine = () => {
                    throw new Error('test error');
                };
                return parser;
            });

            renderWithIntl(
                <Markdown
                    {...baseProps}
                    value='This is a test'
                />,
            );

            expect(screen.queryByText('This is a text')).not.toBeVisible();
            expect(screen.getByText('An error occurred while parsing this text')).toBeVisible();
        });

        test('should catch errors when parsing Markdown', () => {
            jest.spyOn(CommonMark, 'Parser').mockImplementation(() => {
                const parser = new Parser();
                parser.incorporateLine = () => {
                    throw new Error('test error');
                };
                return parser;
            });

            renderWithIntl(
                <Markdown
                    {...baseProps}
                    value='This is a test'
                />,
            );

            expect(screen.queryByText('This is a text')).not.toBeVisible();
            expect(screen.getByText('An error occurred while parsing this text')).toBeVisible();
        });

        test('should catch errors when transforming Markdown', () => {
            jest.spyOn(Transforms, 'highlightMentions').mockImplementation(() => {
                throw new Error('test error');
            });

            renderWithIntl(
                <Markdown
                    {...baseProps}
                    value='This is a test'
                />,
            );

            expect(screen.queryByText('This is a text')).not.toBeVisible();
            expect(screen.getByText('An error occurred while parsing this text')).toBeVisible();
        });

        test('should catch errors when rendering Markdown', () => {
            jest.spyOn(CommonMark, 'Parser').mockImplementation(() => {
                const parser = new Parser();
                parser.parse = () => {
                    // This replicates what was returned by the parser to cause MM-61148
                    const document = new Node('document');

                    const paragraph = new Node('paragraph');
                    (paragraph as any)._string_content = 'some text';

                    document.appendChild(new Node('table'));

                    return document;
                };
                return parser;
            });

            renderWithIntl(
                <Markdown
                    {...baseProps}
                    value='This is a test'
                />,
            );

            expect(screen.queryByText('This is a text')).not.toBeVisible();
            expect(screen.getByText('An error occurred while rendering this text')).toBeVisible();
        });

        test('should catch errors when with Latex', () => {
            const value =
                '```latex\n' +
                '\\\\\\\\asdfasdfasdf\n' +
                '```\n';

            renderWithIntl(
                <Markdown
                    {...baseProps}
                    value={value}
                />,
            );

            expect(screen.queryByText('This is a text')).not.toBeVisible();
            expect(screen.getByText('An error occurred while rendering this text')).toBeVisible();
        });
    });

    describe('image render gate', () => {
        const {getCurrentServerFileSource} = testExports;

        beforeEach(() => {
            jest.restoreAllMocks();
        });

        it.each([
            `${SERVER_URL}/api/v4/files/${FILE_ID}`,
            `${SERVER_URL}/api/v4/files/${FILE_ID}/preview?width=120#image`,
            `/api/v4/files/${FILE_ID}`,
            `/api/v4/files/${FILE_ID}/preview`,
        ])('should accept a current-server file endpoint: %s', (source) => {
            expect(getCurrentServerFileSource(source, SERVER_URL)).toBeDefined();
        });

        it.each([
            `https://external.example.com/mattermost/api/v4/files/${FILE_ID}`,
            `https://mattermost.example.com.evil.test/mattermost/api/v4/files/${FILE_ID}`,
            `https://mattermost.example.com:8443/mattermost/api/v4/files/${FILE_ID}`,
            `http://mattermost.example.com/mattermost/api/v4/files/${FILE_ID}`,
            `https://mattermost.example.com/mattermost/api/v4/users/${FILE_ID}`,
            `https://mattermost.example.com/mattermost/api/v4/files/${FILE_ID}/preview/extra`,
            `https://user@mattermost.example.com/mattermost/api/v4/files/${FILE_ID}`,
            `//mattermost.example.com/mattermost/api/v4/files/${FILE_ID}`,
            `https://mattermost.example.com/api/v4/files/${FILE_ID}`,
            `https://mattermost.example.com/mattermost/api/v4/files%2F${FILE_ID}`,
            `/api/v4/files/${FILE_ID.toUpperCase()}`,
        ])('should reject a non-file or malformed endpoint: %s', (source) => {
            expect(getCurrentServerFileSource(source, SERVER_URL)).toBeUndefined();
        });

        it.each([
            [
                `${SERVER_URL}/api/v4/files/${FILE_ID}`,
                `${SERVER_URL}/api/v4/files/${FILE_ID}/preview`,
            ],
            [
                `${SERVER_URL}/api/v4/files/${FILE_ID}?width=120#image`,
                `${SERVER_URL}/api/v4/files/${FILE_ID}/preview?width=120#image`,
            ],
            [
                `${SERVER_URL}/api/v4/files/${FILE_ID}/preview?width=120#image`,
                `${SERVER_URL}/api/v4/files/${FILE_ID}/preview?width=120#image`,
            ],
        ])('should render metadata-less current-server file source %s as a preview', (source, expectedSource) => {
            renderWithIntl(
                <ServerUrlProvider server={{displayName: 'Mattermost', url: SERVER_URL}}>
                    <Markdown
                        {...baseProps}
                        postId='post-id'
                        value={`![](${source})`}
                    />
                </ServerUrlProvider>,
            );

            expect(screen.getByTestId('markdown_image').props.children).toBe(expectedSource);
        });

        it('should suppress an external image without image metadata', () => {
            renderWithIntl(
                <ServerUrlProvider server={{displayName: 'Mattermost', url: SERVER_URL}}>
                    <Markdown
                        {...baseProps}
                        postId='post-id'
                        value='![](https://external.example.com/image.png)'
                    />
                </ServerUrlProvider>,
            );

            expect(screen.queryByTestId('markdown_image')).not.toBeVisible();
        });

        it('should preserve external image rendering when image metadata is present', () => {
            renderWithIntl(
                <ServerUrlProvider server={{displayName: 'Mattermost', url: SERVER_URL}}>
                    <Markdown
                        {...baseProps}
                        imagesMetadata={{}}
                        postId='post-id'
                        value='![](https://external.example.com/image.png)'
                    />
                </ServerUrlProvider>,
            );

            expect(screen.getByTestId('markdown_image')).toBeVisible();
        });

        it('should suppress a metadata-less file image inside a table', () => {
            const value = `| image |\n| --- |\n| ![](${SERVER_URL}/api/v4/files/${FILE_ID}) |`;
            renderWithIntl(
                <ServerUrlProvider server={{displayName: 'Mattermost', url: SERVER_URL}}>
                    <Markdown
                        {...baseProps}
                        postId='post-id'
                        value={value}
                    />
                </ServerUrlProvider>,
            );

            expect(screen.queryByTestId('markdown_image')).not.toBeVisible();
            expect(screen.queryByTestId('markdown_table_image')).not.toBeVisible();
        });

        it('should preserve metadata-backed image rendering inside a table', () => {
            const value = '| image |\n| --- |\n| ![](https://external.example.com/image.png) |';
            renderWithIntl(
                <ServerUrlProvider server={{displayName: 'Mattermost', url: SERVER_URL}}>
                    <Markdown
                        {...baseProps}
                        imagesMetadata={{}}
                        postId='post-id'
                        value={value}
                    />
                </ServerUrlProvider>,
            );

            expect(screen.getByTestId('markdown_table_image')).toBeVisible();
        });

        it('should suppress a current-server file URL in an unsafe-links post', () => {
            renderWithIntl(
                <ServerUrlProvider server={{displayName: 'Mattermost', url: SERVER_URL}}>
                    <Markdown
                        {...baseProps}
                        imagesMetadata={{}}
                        isUnsafeLinksPost={true}
                        postId='post-id'
                        value={`![](${SERVER_URL}/api/v4/files/${FILE_ID})`}
                    />
                </ServerUrlProvider>,
            );

            expect(screen.queryByTestId('markdown_image')).not.toBeVisible();
        });
    });

    describe('renderHashtagWithStyles', () => {
        const {renderHashtagWithStyles} = testExports;

        test('should render hashtag with correct text and link styling', () => {
            const baseTextStyle = {
                color: '#000000',
                ...typography('Body', 200),
            };
            const textStyles = getMarkdownTextStyles(baseProps.theme);
            const context: string[] = [];

            renderWithIntl(
                renderHashtagWithStyles(context, 'test', textStyles, baseTextStyle),
            );

            const hashtagElement = screen.getByText('#test');
            expect(hashtagElement).toBeVisible();

            const flattenedStyle = StyleSheet.flatten(hashtagElement.props.style);
            expect(flattenedStyle).toMatchObject({
                fontSize: 16,
                color: baseProps.theme.linkColor,
            });
        });

        test('should render hashtag in heading with correct heading font size', () => {
            const baseTextStyle = {
                color: '#000000',
                ...typography('Body', 200),
            };
            const textStyles = getMarkdownTextStyles(baseProps.theme);
            const context: string[] = ['heading1'];

            renderWithIntl(
                renderHashtagWithStyles(context, 'hashtag', textStyles, baseTextStyle),
            );

            const hashtagElement = screen.getByText('#hashtag');
            expect(hashtagElement).toBeVisible();

            const flattenedStyle = StyleSheet.flatten(hashtagElement.props.style);
            expect(flattenedStyle).toMatchObject({
                fontSize: 28,
            });
        });

        test('should apply heading2 styles when in heading2 context', () => {
            const baseTextStyle = {
                color: '#000000',
                ...typography('Body', 200),
            };
            const textStyles = getMarkdownTextStyles(baseProps.theme);
            const context: string[] = ['heading2'];

            renderWithIntl(
                renderHashtagWithStyles(context, 'heading2tag', textStyles, baseTextStyle),
            );

            const hashtagElement = screen.getByText('#heading2tag');
            expect(hashtagElement).toBeVisible();

            const flattenedStyle = StyleSheet.flatten(hashtagElement.props.style);
            expect(flattenedStyle).toMatchObject({
                fontSize: 25,
            });
        });

        test('should have clickable onPress handler', () => {
            const baseTextStyle = {
                color: '#000000',
                ...typography('Body', 200),
            };
            const textStyles = getMarkdownTextStyles(baseProps.theme);
            const context: string[] = [];

            renderWithIntl(
                renderHashtagWithStyles(context, 'clickable', textStyles, baseTextStyle),
            );

            const hashtagElement = screen.getByText('#clickable');
            expect(hashtagElement.props.onPress).toBeDefined();
        });

        test('should include both base text style and link color', () => {
            const baseTextStyle = {
                color: '#000000',
                ...typography('Body', 200),
                fontFamily: 'OpenSans',
            };
            const textStyles = getMarkdownTextStyles(baseProps.theme);
            const context: string[] = [];

            renderWithIntl(
                renderHashtagWithStyles(context, 'styled', textStyles, baseTextStyle),
            );

            const hashtagElement = screen.getByText('#styled');
            const flattenedStyle = StyleSheet.flatten(hashtagElement.props.style);

            expect(flattenedStyle).toMatchObject({
                fontSize: 16,
                fontFamily: 'OpenSans',
                color: baseProps.theme.linkColor,
            });
        });
    });
});
