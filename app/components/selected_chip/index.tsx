// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type SelectedChipProps = {
    id: string;
    text: string;
    extra?: React.ReactNode;
    onRemove: (id: string) => void;
    testID?: string;
}

export const USER_CHIP_HEIGHT = 32;
export const USER_CHIP_BOTTOM_MARGIN = 8;
const FADE_DURATION = 100;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            borderRadius: 16,
            height: USER_CHIP_HEIGHT,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: USER_CHIP_BOTTOM_MARGIN,
            marginRight: 8,
            paddingHorizontal: 7,
        },
        extraContent: {
            flexDirection: 'row',
            alignItems: 'center',
            color: theme.centerChannelColor,
        },
        text: {
            marginLeft: 8,
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        remove: {
            justifyContent: 'center',
            marginLeft: 7,
        },
    };
});

export default function SelectedChip({
    id,
    text,
    extra,
    onRemove,
    testID,
}: SelectedChipProps) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const onPress = useCallback(() => {
        onRemove(id);
    }, [onRemove, id]);

    return (
        <Animated.View
            entering={FadeIn.duration(FADE_DURATION)}
            exiting={FadeOut.duration(FADE_DURATION)}
            style={style.container}
            testID={testID}
        >
            {extra && (
                <View style={style.extraContent}>
                    {extra}
                </View>
            )}
            <Text
                style={style.text}
                testID={`${testID}.display_name`}
            >
                {text}
            </Text>
            <TouchableOpacity
                style={style.remove}
                onPress={onPress}
                testID={`${testID}.remove.button`}
            >
                <CompassIcon
                    name='close-circle'
                    size={18}
                    color={changeOpacity(theme.centerChannelColor, 0.32)}
                />
            </TouchableOpacity>
        </Animated.View>
    );
}
