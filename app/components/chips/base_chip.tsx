// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Text, TouchableOpacity, useWindowDimensions} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {nonBreakingString} from '@utils/strings';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {CHIP_BOTTOM_MARGIN, CHIP_HEIGHT} from './constants';

type SelectedChipProps = {
    onPress: () => void;
    testID?: string;
    showRemoveOption?: boolean;
    showAnimation?: boolean;
    label: string;
    prefix?: JSX.Element;
}

const FADE_DURATION = 100;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            borderRadius: 16,
            height: CHIP_HEIGHT,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginBottom: CHIP_BOTTOM_MARGIN,
            marginRight: 8,
            paddingHorizontal: 7,
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

export default function BaseChip({
    testID,
    onPress,
    showRemoveOption,
    showAnimation,
    label,
    prefix,
}: SelectedChipProps) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const dimensions = useWindowDimensions();

    const chipContent = (
        <>
            {prefix}
            <Text
                style={[style.text, {maxWidth: dimensions.width * 0.70}]}
                numberOfLines={1}
                testID={`${testID}.display_name`}
            >
                {nonBreakingString(label)}
            </Text>
        </>
    );

    let content;
    if (showRemoveOption) {
        content = (
            <>
                {chipContent}
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
            </>
        );
    } else {
        content = (
            <TouchableOpacity
                style={style.remove}
                onPress={onPress}
                testID={`${testID}.chip_button`}
            >
                {chipContent}
            </TouchableOpacity>
        );
    }

    // https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584
    const useFadeOut = showAnimation && Platform.OS !== 'android';
    return (
        <Animated.View
            entering={showAnimation ? FadeIn.duration(FADE_DURATION) : undefined}
            exiting={useFadeOut ? FadeOut.duration(FADE_DURATION) : undefined}
            style={style.container}
            testID={testID}
        >
            {content}
        </Animated.View>
    );
}
