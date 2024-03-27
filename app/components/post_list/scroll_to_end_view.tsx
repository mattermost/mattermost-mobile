// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef} from 'react';
import {useIntl} from 'react-intl';
import {Platform, Pressable, Text, useWindowDimensions, View, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet, useKeyboardHeight, useViewPosition} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    const commonButtonStyle: ViewStyle = {
        height: 40,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    };
    return {
        buttonStyle: {
            position: 'absolute',
            alignSelf: 'center',
            bottom: -70,
            flexDirection: 'row',
            elevation: 4,
            shadowOpacity: 0.2,
            shadowOffset: {width: 0, height: 4},
            shadowRadius: 4,
        },
        scrollToEndButton: {
            ...commonButtonStyle,
            width: 40,
            borderRadius: 32,
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderWidth: 1,
        },
        scrollToEndBadge: {
            ...commonButtonStyle,
            borderRadius: 8,
            paddingHorizontal: 12,
            backgroundColor: theme.buttonBg,
        },
        newMessagesText: {
            color: theme.buttonColor,
            paddingHorizontal: 8,
            overflow: 'hidden',
            ...typography('Body', 200, 'SemiBold'),
        },
    };
});

type Props = {
    onPress: () => void;
    isNewMessage: boolean;
    showScrollToEndBtn: boolean;
    location: string;
};

const ScrollToEndView = ({
    onPress,
    isNewMessage,
    showScrollToEndBtn,
    location,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleFromTheme(theme);

    // On iOS we have to take account of the keyboard.
    // We cannot use `useKeyboardOverlap` here because of the positioning of the element.
    const guidingViewRef = useRef<View>(null);
    const keyboardHeight = useKeyboardHeight();
    const viewPosition = useViewPosition(guidingViewRef, []);
    const dimensions = useWindowDimensions();
    const bottomSpace = (dimensions.height - viewPosition);
    const keyboardOverlap = Platform.select({ios: Math.max(0, keyboardHeight - bottomSpace), default: 0});

    // Thread view on iPads has to take into account the insets
    const insets = useSafeAreaInsets();
    const shouldAdjustBottom = (Platform.OS === 'ios') && isTablet && (location === Screens.THREAD) && !keyboardHeight;
    const bottomAdjustment = shouldAdjustBottom ? insets.bottom : 0;

    const message = location === Screens.THREAD ?
        intl.formatMessage({id: 'postList.scrollToBottom.newReplies', defaultMessage: 'New replies'}) :
        intl.formatMessage({id: 'postList.scrollToBottom.newMessages', defaultMessage: 'New messages'});

    const animatedStyle = useAnimatedStyle(
        () => ({
            transform: [
                {
                    translateY: withTiming(showScrollToEndBtn ? -80 - keyboardOverlap - bottomAdjustment : 0, {duration: 300}),
                },
            ],
            maxWidth: withTiming(isNewMessage ? 169 : 40, {duration: 300}),
        }),
        [showScrollToEndBtn, isNewMessage, keyboardOverlap, bottomAdjustment],
    );

    const scrollButtonStyles = isNewMessage ? styles.scrollToEndBadge : styles.scrollToEndButton;

    return (
        <View ref={guidingViewRef}>
            <Animated.View style={[animatedStyle, styles.buttonStyle]}>
                <Pressable
                    onPress={onPress}
                    style={scrollButtonStyles}
                >
                    <CompassIcon
                        size={18}
                        name='arrow-down'
                        color={isNewMessage ? theme.buttonColor : changeOpacity(theme.centerChannelColor, 0.56)}
                    />
                    {isNewMessage && (
                        <Text style={styles.newMessagesText}>{message}</Text>
                    )}
                </Pressable>
            </Animated.View>
        </View>
    );
};

export default React.memo(ScrollToEndView);
