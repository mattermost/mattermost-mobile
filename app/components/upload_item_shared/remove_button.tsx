// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, View, Pressable} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const hitSlop = {top: 10, bottom: 10, left: 10, right: 10};

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
            top: -12,
            right: -10,
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
    const handlePress = usePreventDoubleTap(useCallback(() => {
        onPress();
    }, [onPress]));

    return (
        <Pressable
            style={({pressed}) => [style.tappableContainer, pressed && {opacity: 0.72}]}
            onPress={handlePress}
            testID={testID}
            hitSlop={hitSlop}
        >
            <View style={style.removeButton}>
                <CompassIcon
                    name='close-circle'
                    color={changeOpacity(theme.centerChannelColor, 0.64)}
                    size={24}
                />
            </View>
        </Pressable>
    );
}
