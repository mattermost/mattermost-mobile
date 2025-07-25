// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onPress: () => void;
    testID?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        tappableContainer: {
            position: 'absolute',
            elevation: 11,
            width: 24,
            height: 24,
        },
        removeButton: {
            borderRadius: 12,
            alignSelf: 'center',
            marginTop: Platform.select({
                ios: 5.4,
                android: 4.75,
            }),
            backgroundColor: theme.centerChannelBg,
            width: 24,
            height: 25,
        },
    };
});

export default function RemoveButton({
    onPress,
    testID = 'remove-button',
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const containerStyle = [
        style.tappableContainer,
        {top: -12, right: -10},
    ];

    return (
        <TouchableWithFeedback
            style={containerStyle}
            onPress={onPress}
            type={'opacity'}
            testID={testID}
        >
            <View style={style.removeButton}>
                <CompassIcon
                    name='close-circle'
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    size={24}
                />
            </View>
        </TouchableWithFeedback>
    );
}
