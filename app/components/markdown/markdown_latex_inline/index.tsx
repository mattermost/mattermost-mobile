// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, View, type DimensionValue} from 'react-native';

import MathView from '@components/math_view';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    content: string;
    maxMathWidth: DimensionValue;
    theme: Theme;
    baseFontSize?: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        mathStyle: {
            marginVertical: Platform.select({ios: 1.5, default: 0}),
            alignItems: 'center' as const,
        },
        viewStyle: {
            flexDirection: 'row' as const,
            flexWrap: 'wrap' as const,
        },
        errorText: {
            color: theme.errorTextColor,
            flexDirection: 'row' as const,
            flexWrap: 'wrap' as const,
            fontStyle: 'italic' as const,
            ...typography('Body', 100),
        },
    };
});

const LatexInline = ({content, maxMathWidth, theme, baseFontSize}: Props) => {
    const style = getStyleSheet(theme);

    return (
        <View
            style={style.viewStyle}
            key={content}
            testID='markdown_latex_inline'
        >
            <MathView
                style={[style.mathStyle, {maxWidth: maxMathWidth || '100%'}]}
                latexCode={content}
                fontSize={baseFontSize}
                displayMode={false}
                errorStyle={style.errorText}
            />
        </View>
    );
};

export default LatexInline;
