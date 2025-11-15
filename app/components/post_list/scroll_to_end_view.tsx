// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, Text, View, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useTheme} from '@context/theme';
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
            bottom: 0,
            flexDirection: 'row',
        },
        shadow: {
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
    onPress: (forceScrollToEnd?: boolean) => void;
    isNewMessage: boolean;
    showScrollToEndBtn: boolean;
    location: string;
    testID?: string;
};

const SCROLL_TO_END_BOTTOM_OFFSET = 15;

const ScrollToEndView = ({
    onPress,
    isNewMessage,
    showScrollToEndBtn,
    location,
    testID = 'scroll-to-end-view',
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const {height, postInputContainerHeight} = useKeyboardAnimationContext();

    // On iOS we have to take account of the keyboard.
    // We cannot use `useKeyboardOverlap` here because of the positioning of the element.
    const guidingViewRef = useRef<View>(null);

    const message = location === Screens.THREAD ? intl.formatMessage({id: 'postList.scrollToBottom.newReplies', defaultMessage: 'New replies'}) : intl.formatMessage({id: 'postList.scrollToBottom.newMessages', defaultMessage: 'New messages'});

    const animatedStyle = useAnimatedStyle(
        () => {
            return {
                transform: [
                    {
                        translateY: showScrollToEndBtn ? -postInputContainerHeight - height.value - SCROLL_TO_END_BOTTOM_OFFSET : -SCROLL_TO_END_BOTTOM_OFFSET,
                    },
                ],
                maxWidth: withTiming(isNewMessage ? 169 : 40, {duration: 300}),
                opacity: withTiming(showScrollToEndBtn ? 1 : 0),
            };
        },
        [showScrollToEndBtn, isNewMessage, height.value, postInputContainerHeight],
    );

    const scrollButtonStyles = isNewMessage ? styles.scrollToEndBadge : styles.scrollToEndButton;

    return (
        <View
            ref={guidingViewRef}
            testID={testID}
        >
            <Animated.View style={[animatedStyle, styles.buttonStyle]}>
                <Pressable
                    onPress={() => onPress(true)}
                    style={[scrollButtonStyles, styles.shadow]}
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
