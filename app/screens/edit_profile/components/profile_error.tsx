// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ErrorTextComponent from '@components/error_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type DisplayErrorProps = {
    error: unknown;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        errorContainer: {
            backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
            width: '100%',
            maxHeight: 48,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
        },
        text: {
            ...typography('Heading', 100),
            color: theme.centerChannelColor,
        },
        icon: {
            color: changeOpacity(theme.dndIndicator, 0.64),
            ...typography('Heading', 300),
            marginRight: 9,
        },
    };
});

const ProfileError = ({error}: DisplayErrorProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.errorContainer}>
            <CompassIcon
                style={style.icon}
                size={18}
                name='alert-outline'
            />
            <ErrorTextComponent
                testID='edit_profile.error.text'
                error={error}
                textStyle={style.text}
            />
        </View>
    );
};

export default ProfileError;
