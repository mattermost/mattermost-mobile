// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, Text, TextStyle, ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {ClientError} from '@utils/client_error';
import {makeStyleSheetFromTheme} from '@utils/theme';

export type ClientErrorWithIntl = ClientError & {intl: {values?: Record<string, any>}}

type ErrorProps = {
    error: ClientErrorWithIntl | string;
    testID?: string;
    textStyle?: StyleProp<ViewStyle> | StyleProp<TextStyle>
    theme: Theme;
}

const ErrorText = ({error, testID, textStyle, theme}: ErrorProps) => {
    const style = getStyleSheet(theme);
    const message = typeof (error) === 'string' ? error : error.message;

    if (typeof (error) !== 'string' && error.intl) {
        const {intl} = error;
        return (
            <FormattedText
                testID={testID}
                id={intl.id}
                defaultMessage={intl.defaultMessage}
                values={intl.values}
                style={[style.errorLabel, textStyle]}
            />
        );
    }

    return (
        <Text
            testID={testID}
            style={[style.errorLabel, textStyle]}
        >
            {message}
        </Text>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        errorLabel: {
            color: (theme?.errorTextColor || '#DA4A4A'),
            marginTop: 15,
            marginBottom: 15,
            fontSize: 12,
            textAlign: 'left',
        },
    };
});

export default ErrorText;
