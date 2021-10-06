// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import ErrorText from '@components/error_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type DisplayErrorProps = {
    error: Partial<ClientErrorProps> | string;
}

const DisplayError = ({error}: DisplayErrorProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.errorContainer}>
            <View style={style.errorWrapper}>
                <ErrorText
                    theme={theme}
                    testID='edit_profile.error.text'
                    error={error}
                    textStyle={style.errorText}
                />
            </View>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        errorContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            width: '100%',
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        errorText: {
            fontSize: 14,
            marginHorizontal: 15,
        },
    };
});

export default DisplayError;
