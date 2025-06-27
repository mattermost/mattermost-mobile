// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Platform, Text, TouchableOpacity} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {useWindowDimensions} from '@hooks/device';
import {nonBreakingString} from '@utils/strings';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {CHIP_HEIGHT} from './constants';

type SelectedChipProps = {
    onPress?: () => void;
    testID?: string;
    showRemoveOption?: boolean;
    showAnimation?: boolean;
    label: string;
    prefix?: JSX.Element;
    maxWidth?: number;
    type?: 'normal' | 'link' | 'danger';
    boldText?: boolean;
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
            padding: 2,
        },
        dangerContainer: {
            backgroundColor: changeOpacity(theme.dndIndicator, 0.08),
        },
        text: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
        },
        linkText: {
            color: theme.linkColor,
        },
        dangerText: {
            color: theme.dndIndicator,
        },
        remove: {
            justifyContent: 'center',
            marginLeft: 5,
            marginRight: 4,
        },
        chipContent: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        boldText: {
            ...typography('Body', 100, 'SemiBold'),
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
    maxWidth,
    type = 'normal',
    boldText = false,
}: SelectedChipProps) {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const dimensions = useWindowDimensions();
    const textStyle = useMemo(() => {
        // We set the max width to 70% of the screen width to make sure
        // text like names get ellipsized correctly.
        const textMaxWidth = maxWidth || dimensions.width * 0.70;
        const marginRight = showRemoveOption ? undefined : 7;
        const marginLeft = prefix ? 5 : 7;
        return [
            style.text,
            {maxWidth: textMaxWidth, marginRight, marginLeft},
            type === 'link' && style.linkText,
            type === 'danger' && style.dangerText,
            boldText && style.boldText,
        ];
    }, [maxWidth, dimensions.width, showRemoveOption, prefix, style.text, style.linkText, style.dangerText, style.boldText, type, boldText]);
    const containerStyle = useMemo(() => {
        return [
            style.container,
            type === 'danger' && style.dangerContainer,
        ];
    }, [style.container, style.dangerContainer, type]);

    const chipContent = (
        <>
            {prefix}
            <Text
                style={textStyle}
                numberOfLines={1}
                testID={`${testID}.display_name`}
            >
                {nonBreakingString(label)}
            </Text>
        </>
    );

    let content = chipContent;
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
                        size={16}
                        color={changeOpacity(theme.centerChannelColor, 0.32)}
                    />
                </TouchableOpacity>
            </>
        );
    } else if (onPress) {
        content = (
            <TouchableOpacity
                style={style.chipContent}
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
            style={containerStyle}
            testID={testID}
        >
            {content}
        </Animated.View>
    );
}
