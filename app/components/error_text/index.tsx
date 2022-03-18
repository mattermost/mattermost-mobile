// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, Text, TextStyle, ViewStyle} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ErrorProps = {
    error: ErrorText;
    testID?: string;
    textStyle?: StyleProp<ViewStyle> | StyleProp<TextStyle>;
}

const ErrorTextComponent = ({error, testID, textStyle}: ErrorProps) => {
    const theme = useTheme();
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

export default ErrorTextComponent;
