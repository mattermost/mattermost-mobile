// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CodeRoute from './code';

// react-syntax-highlighter pulls in ESM-only deps (refractor/hastscript) that
// jest doesn't transform, and it's not the code under test here. Stub it with a
// passthrough that renders the highlighted `code` as plain text. The crash this
// test targets happens in our own Highlighter (getMaximumLineLength -> code.split)
// before this component is ever rendered, so stubbing it does not hide the bug.
jest.mock('react-syntax-highlighter', () => {
    const {Text: RNText} = require('react-native');
    return {
        __esModule: true,
        default: ({children}: {children: React.ReactNode}) => <RNText>{children}</RNText>,
    };
});

jest.mock('react-syntax-highlighter/dist/cjs/styles/hljs', () => ({
    githubGist: {hljs: {}},
    monokai: {hljs: {}},
    solarizedDark: {hljs: {}},
    solarizedLight: {hljs: {}},
}));

// ESM-only submodule imported transitively by the syntax_highlight renderer.
jest.mock('react-syntax-highlighter/create-element', () => ({
    createStyleObject: jest.fn(() => ({})),
}));

// Mock expo-router with just the exports the route + screen use, so each test
// can feed the route its params via useLocalSearchParams. Values match what
// propsToParams produces in production: JSON-encoded strings.
const mockUseLocalSearchParams = jest.fn();
jest.mock('expo-router', () => ({
    useLocalSearchParams: () => mockUseLocalSearchParams(),
    useNavigation: () => ({
        setOptions: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
    }),
    useRouter: () => ({
        canGoBack: jest.fn(() => true),
    }),
}));

describe('CodeRoute (MM-69330)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Regression: tapping a code block whose text happens to be valid JSON
    // (e.g. "42", "{...}", "true") used to crash the Highlighter because
    // `safeParseJSON` coerced the string into a number/object/boolean.
    // Now that propsToParams always JSON-encodes on the send side, decoding
    // '"42"' with safeParseJSON produces the string '42', preserving type.
    it.each([
        ['a bare number', '42'],
        ['a JSON object', '{"hello": "world"}'],
        ['a JSON array', '[1, 2, 3]'],
        ['a boolean literal', 'true'],
    ])('renders without crashing when the code block content is %s', (_label, code) => {
        mockUseLocalSearchParams.mockReturnValue({
            code: JSON.stringify(code),
            language: JSON.stringify('json'),
            textStyle: JSON.stringify({}),
            title: JSON.stringify('Code'),
        });

        const {getByText} = renderWithIntlAndTheme(<CodeRoute/>);

        // The raw code text must reach the viewer verbatim, as a string.
        expect(getByText(code)).toBeTruthy();
    });

    it('renders plain (non-JSON) code without crashing', () => {
        const code = 'const greeting = "hello";';
        mockUseLocalSearchParams.mockReturnValue({
            code: JSON.stringify(code),
            language: JSON.stringify('javascript'),
            textStyle: JSON.stringify({}),
            title: JSON.stringify('Code'),
        });

        const {getByText} = renderWithIntlAndTheme(<CodeRoute/>);

        expect(getByText(code)).toBeTruthy();
    });
});
