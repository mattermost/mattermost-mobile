// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useMemo} from 'react';
import {Pressable, Text} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {useTheme} from '@app/context/theme';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import CompassIcon from '@components/compass_icon';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        scrollToEndBtn: {
            position: 'absolute',
            alignSelf: 'center',
            width: 40,
            height: 40,
            borderRadius: 40,
            bottom: -70,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            backgroundColor: theme.buttonColor,
            elevation: 4,
        },
        scrollToEndBadge: {
            position: 'absolute',
            alignSelf: 'center',
            height: 40,
            borderRadius: 8,
            bottom: -70,
            paddingHorizontal: 8,
            backgroundColor: theme.buttonBg,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            elevation: 4,
        },
        newMessagesText: {
            color: '#fff',
            paddingHorizontal: 8,
            overflow: 'hidden',
        },
        pressableBtn: {
            flexDirection: 'row',
        },
    };
});

type Props = {
    onScrollToEnd: () => void;
    isNewMessage: boolean;
    showScrollToEndBtn: boolean;
    message: string;
};

const ScrollToEndView = ({
    onScrollToEnd,
    isNewMessage,
    showScrollToEndBtn,
    message,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const animatedStyle = useAnimatedStyle(
        () => ({
            transform: [
                {
                    translateY: withTiming(showScrollToEndBtn ? -80 : 0, {duration: 500}),
                },
            ],
            maxWidth: withTiming(isNewMessage ? 169 : 40, {duration: 500}),
        }),
        [showScrollToEndBtn, isNewMessage],
    );

    const scrollBtnStyles = useMemo(
        () => (isNewMessage ? styles.scrollToEndBadge : styles.scrollToEndBtn),
        [isNewMessage],
    );

    return (
        <Animated.View style={[animatedStyle, scrollBtnStyles]}>
            <Pressable
                onPress={onScrollToEnd}
                style={styles.pressableBtn}
            >
                <CompassIcon
                    size={18}
                    name='arrow-down'
                    color={isNewMessage ? theme.sidebarHeaderTextColor : theme.centerChannelBg}
                />
                {isNewMessage && (
                    <Text style={styles.newMessagesText}>{message}</Text>
                )}
            </Pressable>
        </Animated.View>
    );
};

export default React.memo(ScrollToEndView);
