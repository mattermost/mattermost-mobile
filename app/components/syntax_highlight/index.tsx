// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import SyntaxHighlighter from 'react-syntax-highlighter';
import {githubGist as github, monokai, solarizedDark, solarizedLight} from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import {useTheme} from '@context/theme';

import CodeHighlightRenderer from './renderer';

import type {SyntaxHiglightProps} from '@typings/components/syntax_highlight';

const codeTheme: Record<string, any> = {
    github,
    monokai,
    'solarized-dark': solarizedDark,
    'solarized-light': solarizedLight,
};

const styles = StyleSheet.create({
    preTag: {
        padding: 5,
        width: '100%',
    },
    flex: {
        flex: 1,
    },
});

function getMaximumLineLength(code: string) {
    return code.split('\n').reduce((prev, v) => Math.max(prev, v.length), 0);
}

const MAXIMUM_CODE_LINE_LENGTH = 300;

const Highlighter = ({code, language, textStyle, selectable = false}: SyntaxHiglightProps) => {
    const theme = useTheme();
    const style = codeTheme[theme.codeTheme] || github;
    const preTagStyle = useMemo(() => [
        styles.preTag,
        selectable && styles.flex,
        {backgroundColor: style.hljs.background || theme.centerChannelBg},
    ],
    [theme, selectable, style]);
    const maximumLineLength = useMemo(() => getMaximumLineLength(code), [code]);
    const languageToUse = maximumLineLength > MAXIMUM_CODE_LINE_LENGTH ? 'text' : language;

    const nativeRenderer = useCallback(({rows, stylesheet}: rendererProps) => {
        const digits = rows.length.toString().length;
        return (
            <CodeHighlightRenderer
                digits={digits}
                rows={rows}
                stylesheet={stylesheet}
                defaultColor={style.hljs.color || theme.centerChannelColor}
                fontFamily={textStyle.fontFamily || 'monospace'}
                fontSize={textStyle.fontSize}
                selectable={selectable}
            />
        );
    }, [textStyle, theme, style]);

    const preTag = useCallback((info: any) => (
        <View
            style={preTagStyle}
        >
            {info.children}
        </View>
    ), [preTagStyle]);

    return (
        <SyntaxHighlighter
            style={style}
            language={languageToUse}
            horizontal={true}
            showLineNumbers={true}
            renderer={nativeRenderer}
            PreTag={preTag}
            CodeTag={View}
        >
            {code}
        </SyntaxHighlighter>
    );
};

export default Highlighter;
