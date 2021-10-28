// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';

type ErrorContentProps = {
    blockStyles: MarkdownBlockStyles;
    errorText: string | number;
    textStyles: MarkdownTextStyles;
    theme: Theme;
};

const ErrorContent = ({blockStyles, errorText, textStyles, theme}: ErrorContentProps) => {
    const style = getStyleSheet(theme);

    return (
        <View style={style.errorTextContainer}>
            <Markdown
                theme={theme}
                baseTextStyle={style.errorText}
                textStyles={textStyles}
                blockStyles={blockStyles}
                value={errorText}
            />
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        errorTextContainer: {
            marginHorizontal: 15,
            marginVertical: 10,
        },
        errorText: {
            fontSize: 12,
            color: theme.errorTextColor,
        },
    };
});

export default ErrorContent;
