// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import * as CommonMark from 'commonmark';
const {Node} = CommonMark;
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';

import Markdown from './markdown';
import * as Transforms from './transform';

const Parser = jest.requireActual('commonmark').Parser;

describe('Markdown', () => {
    const baseProps: React.ComponentProps<typeof Markdown> = {
        baseTextStyle: {},
        enableInlineLatex: true,
        enableLatex: true,
        location: 'Channel',
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
});
