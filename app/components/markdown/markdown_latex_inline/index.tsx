// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View, type DimensionValue} from 'react-native';

import ErrorBoundary from '@components/markdown/error_boundary';
import MathView from '@components/math_view';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    content: string;
    maxMathWidth: DimensionValue;
    theme: Theme;
}

type MathViewErrorProps = {
    error: Error;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        mathStyle: {
            marginVertical: 3,
            color: theme.centerChannelColor,
        },
        viewStyle: {
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        errorText: {
            color: theme.errorTextColor,
            flexDirection: 'row',
            flexWrap: 'wrap',
            fontStyle: 'italic',
            ...typography('Body', 100),
        },
    };
});

const LatexInline = ({content, maxMathWidth, theme}: Props) => {
    const {formatMessage} = useIntl();
    const style = getStyleSheet(theme);

    const onRenderErrorMessage = (errorMsg: MathViewErrorProps) => {
        const error = formatMessage({id: 'markdown.latex.error', defaultMessage: 'Latex render error'});
        return <Text style={style.errorText}>{`${error}: ${errorMsg.error.message}`}</Text>;
    };

    return (
        <ErrorBoundary
            error={formatMessage({id: 'markdown.latex.error', defaultMessage: 'Latex render error'})}
            theme={theme}
        >
            <View
                style={style.viewStyle}
                key={content}
                testID='markdown_latex_inline'
            >
                <MathView
                    style={[style.mathStyle, {maxWidth: maxMathWidth || '100%'}]}
                    math={content}
                    renderError={onRenderErrorMessage}
                    resizeMode='contain'
                />
            </View>
        </ErrorBoundary>
    );
};

export default LatexInline;
