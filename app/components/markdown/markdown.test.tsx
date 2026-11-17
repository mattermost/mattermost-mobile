// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import * as CommonMark from 'commonmark';
const {Node} = CommonMark;
import React from 'react';
import {Platform, StyleSheet} from 'react-native';

import {Preferences, Screens} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';
import {getMarkdownTextStyles} from '@utils/markdown';
import {typography} from '@utils/typography';

import Markdown, {testExports} from './markdown';
import * as Transforms from './transform';

const Parser = jest.requireActual('commonmark').Parser;

jest.mock('@screens/navigation', () => ({
    navigateToRoot: jest.fn(),
}));

jest.mock('./markdown_link', () => {
    const MockReact = require('react');
    const {Text} = require('react-native');

    return {
        __esModule: true,
        default: ({href, children}: {href: string; children: React.ReactNode}) => (
            MockReact.createElement(Text, {testID: 'markdown_link', href}, children)
        ),
    };
});

jest.mock('./markdown_image', () => {
    const MockReact = require('react');
    const {View} = require('react-native');

    return {
        __esModule: true,
        default: (props: any) => (
            MockReact.createElement(View, {testID: 'mock_markdown_image', ...props})
        ),
    };
});

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

    describe('phone number autolinking', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        it('should autolink phone numbers when links are enabled', () => {
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    value='Call 555-123-4567'
                />,
            );

            const links = screen.getAllByTestId('markdown_link');
            expect(links).toHaveLength(1);
            expect(links[0].props.href).toBe('tel:5551234567');
            expect(screen.getByText('555-123-4567')).toBeVisible();
        });

        it('should not autolink phone numbers when links are disabled', () => {
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    disableLinks={true}
                    value='Call 555-123-4567'
                />,
            );

            expect(screen.queryAllByTestId('markdown_link')).toHaveLength(0);
            expect(screen.getByText('Call 555-123-4567')).toBeVisible();
        });

        it('should not autolink phone numbers when the post has unsafe links', () => {
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    isUnsafeLinksPost={true}
                    value='Call 555-123-4567'
                />,
            );

            expect(screen.queryAllByTestId('markdown_link')).toHaveLength(0);
            expect(screen.getByText('Call 555-123-4567')).toBeVisible();
        });
    });

    describe('android data image blocks', () => {
        const DATA_URI = 'data:image/png;base64,iVBORw0KGgo=';
        const originalOS = Platform.OS;

        afterEach(() => {
            Platform.OS = originalOS;
        });

        it('should extract a bare data image from paragraph text on Android preserving order', () => {
            Platform.OS = 'android';
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    postId='post1'
                    value={`Before ![alt](${DATA_URI}) After`}
                />,
            );

            const paragraph = screen.getByTestId('markdown_paragraph');
            const runs = React.Children.toArray(paragraph.props.children);
            expect(runs).toHaveLength(3);

            const images = screen.getAllByTestId('mock_markdown_image');
            expect(images).toHaveLength(1);
            expect(images[0].props.source).toBe(DATA_URI);
            expect(images[0].props.isInline).toBe(false);
            expect((runs[1] as any).props.src).toBe(DATA_URI);
            expect((runs[1] as any).props.isInline).toBe(false);
        });

        it('should keep remote images inline on Android', () => {
            Platform.OS = 'android';
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    postId='post1'
                    imagesMetadata={{'https://example.com/a.png': {height: 10, width: 10} as PostImage}}
                    value='Before ![alt](https://example.com/a.png) After'
                />,
            );

            const paragraph = screen.getByTestId('markdown_paragraph');
            const runs = React.Children.toArray(paragraph.props.children);
            expect(runs).toHaveLength(1);

            const images = screen.getAllByTestId('mock_markdown_image');
            expect(images).toHaveLength(1);
            expect(images[0].props.isInline).not.toBe(false);
        });

        it('should extract a linked data image on Android keeping the link destination', () => {
            Platform.OS = 'android';
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    postId='post1'
                    value={`[![alt](${DATA_URI})](https://example.com)`}
                />,
            );

            const images = screen.getAllByTestId('mock_markdown_image');
            expect(images).toHaveLength(1);
            expect(images[0].props.source).toBe(DATA_URI);
            expect(images[0].props.isInline).toBe(false);
            expect(images[0].props.linkDestination).toBe('https://example.com');
        });

        it('should keep data images inline on iOS', () => {
            Platform.OS = 'ios';
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    postId='post1'
                    value={`Before ![alt](${DATA_URI}) After`}
                />,
            );

            const paragraph = screen.getByTestId('markdown_paragraph');
            const runs = React.Children.toArray(paragraph.props.children);
            expect(runs).toHaveLength(1);

            const images = screen.getAllByTestId('mock_markdown_image');
            expect(images).toHaveLength(1);
            expect(images[0].props.isInline).not.toBe(false);
        });

        it('should keep linked data images inline when links are disabled on Android', () => {
            Platform.OS = 'android';
            renderWithIntl(
                <Markdown
                    {...baseProps}
                    postId='post1'
                    disableLinks={true}
                    value={`[![alt](${DATA_URI})](https://example.com)`}
                />,
            );

            expect(screen.queryAllByTestId('mock_markdown_image')).toHaveLength(0);
        });
    });
});
