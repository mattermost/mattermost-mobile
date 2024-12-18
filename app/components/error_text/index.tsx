// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, Text, type TextStyle, type ViewStyle} from 'react-native';

import {useTheme} from '@context/theme';
import {getErrorMessage} from '@utils/errors';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ErrorProps = {
    error: unknown;
    testID?: string;
    textStyle?: StyleProp<Intersection<TextStyle, ViewStyle>> | StyleProp<TextStyle>;
}

const ErrorTextComponent = ({error, testID, textStyle}: ErrorProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const message = getErrorMessage(error, intl);

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
