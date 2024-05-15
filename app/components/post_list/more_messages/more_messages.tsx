// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, DeviceEventEmitter, View, type ViewToken} from 'react-native';
import Animated, {interpolate, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {resetMessageCount} from '@actions/local/channel';
import {useCallsAdjustment} from '@calls/hooks';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import useDidUpdate from '@hooks/did_update';
import EphemeralStore from '@store/ephemeral_store';
import {makeStyleSheetFromTheme, hexToHue, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import type {PostList} from '@typings/components/post_list';

type Props = {
    channelId: string;
    isCRTEnabled?: boolean;
    isManualUnread?: boolean;
    newMessageLineIndex: number;
    posts: PostList;
    registerScrollEndIndexListener: (fn: (endIndex: number) => void) => () => void;
    registerViewableItemsListener: (fn: (viewableItems: ViewToken[]) => void) => () => void;
    rootId?: string;
    scrollToIndex: (index: number, animated?: boolean, applyOffset?: boolean) => void;
    unreadCount: number;
    theme: Theme;
    testID: string;
}

const HIDDEN_TOP = -60;
const SHOWN_TOP = 5;
const MIN_INPUT = 0;
const MAX_INPUT = 1;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        animatedContainer: {
            position: 'absolute',
            padding: 8,
            width: '100%',
        },
        cancelContainer: {
            alignItems: 'center',
            width: 32,
            height: '100%',
            justifyContent: 'center',
        },
        container: {
            backgroundColor: theme.buttonBg,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            width: '100%',
            height: 40,
            borderRadius: 8,
            paddingTop: 4,
            paddingRight: 4,
            paddingBottom: 4,
            paddingLeft: 8,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 4,
        },
        iconContainer: {
            top: 1,
            width: 32,
        },
        icon: {
            fontSize: 18,
            color: theme.buttonColor,
            alignSelf: 'center',
        },
        closeIcon: {
            color: changeOpacity(theme.buttonColor, 0.56),
        },
        pressContainer: {
            flex: 1,
            flexDirection: 'row',
        },
        textContainer: {
            marginLeft: 8,
        },
        text: {
            color: theme.buttonColor,
            ...typography('Body', 100, 'SemiBold'),
        },
    };
});

const MoreMessages = ({
    channelId,
    isCRTEnabled,
    isManualUnread,
    newMessageLineIndex,
    posts,
    registerViewableItemsListener,
    registerScrollEndIndexListener,
    rootId,
    scrollToIndex,
    unreadCount,
    testID,
    theme,
}: Props) => {
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const pressed = useRef(false);
    const resetting = useRef(false);
    const initialScroll = useRef(false);
    const [loading, setLoading] = useState(EphemeralStore.isLoadingMessagesForChannel(serverUrl, channelId));
    const [remaining, setRemaining] = useState(0);
    const underlayColor = useMemo(() => `hsl(${hexToHue(theme.buttonBg)}, 50%, 38%)`, [theme]);
    const styles = getStyleSheet(theme);
    const top = useSharedValue(0);
    const callsAdjustment = useCallsAdjustment(serverUrl, channelId);

    // The final top:
    const adjustedTop = insets.top + callsAdjustment;

    const BARS_FACTOR = Math.abs((1) / (HIDDEN_TOP - SHOWN_TOP));

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{
            translateY: withSpring(interpolate(
                top.value,
                [
                    MIN_INPUT,
                    MIN_INPUT + BARS_FACTOR,
                    MAX_INPUT - BARS_FACTOR,
                    MAX_INPUT,
                ],
                [
                    HIDDEN_TOP,
                    HIDDEN_TOP,
                    adjustedTop,
                    adjustedTop,
                ],
                'clamp',
            ), {damping: 15}),
        }],
    }), [adjustedTop]);

    // Due to the implementation differences "unreadCount" gets updated for a channel on reset but not for a thread.
    // So we maintain a localUnreadCount to hide the indicator when the count is reset.
    // If we don't maintain the local counter, in the case of a thread, the indicator will be shown again once we scroll down after we reach the top.
    const localUnreadCount = useRef(unreadCount);
    useEffect(() => {
        localUnreadCount.current = unreadCount;
    }, [unreadCount]);

    const resetCount = async () => {
        localUnreadCount.current = 0;

        if (resetting.current || (isCRTEnabled && rootId)) {
            return;
        }

        resetting.current = true;
        await resetMessageCount(serverUrl, channelId);
        resetting.current = false;
    };

    const onViewableItemsChanged = (viewableItems: ViewToken[]) => {
        pressed.current = false;

        if (newMessageLineIndex <= 0 || viewableItems.length === 0 || isManualUnread || resetting.current) {
            return;
        }

        const lastViewableIndex = viewableItems.filter((v) => v.isViewable)[viewableItems.length - 1]?.index || 0;
        const nextViewableIndex = lastViewableIndex + 1;
        if (viewableItems[0].index === 0 && nextViewableIndex > newMessageLineIndex && !initialScroll.current) {
            // Auto scroll if the first post is viewable and
            // * the new message line is viewable OR
            // * the new message line will be the first next viewable item
            scrollToIndex(newMessageLineIndex, true, false);
            resetCount();
            top.value = 0;
            initialScroll.current = true;
            return;
        }

        const readCount = posts.slice(0, lastViewableIndex).filter((v) => v.type === 'post').length;
        const totalUnread = localUnreadCount.current - readCount;
        if (lastViewableIndex >= newMessageLineIndex) {
            resetCount();
            top.value = 0;
        } else if (totalUnread > 0) {
            setRemaining(totalUnread);
            top.value = 1;
        }
    };

    const onScrollEndIndex = () => {
        pressed.current = false;
    };

    const onCancel = useCallback(() => {
        pressed.current = true;
        top.value = 0;
        resetMessageCount(serverUrl, channelId);
        pressed.current = false;
    }, [serverUrl, channelId]);

    const onPress = useCallback(() => {
        if (pressed.current) {
            return;
        }

        pressed.current = true;
        scrollToIndex(newMessageLineIndex, true);
    }, [newMessageLineIndex]);

    useDidUpdate(() => {
        setLoading(EphemeralStore.isLoadingMessagesForChannel(serverUrl, channelId));
    }, [serverUrl, channelId]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.LOADING_CHANNEL_POSTS, ({serverUrl: eventServerUrl, channelId: eventChannelId, value}) => {
            if (eventServerUrl === serverUrl && eventChannelId === channelId) {
                setLoading(value);
            }
        });

        return () => listener.remove();
    }, [serverUrl, channelId]);

    useEffect(() => {
        const unregister = registerScrollEndIndexListener(onScrollEndIndex);

        return () => unregister();
    }, []);

    useEffect(() => {
        const unregister = registerViewableItemsListener(onViewableItemsChanged);

        return () => unregister();
    }, [channelId, unreadCount, newMessageLineIndex, posts]);

    useEffect(() => {
        resetting.current = false;
        initialScroll.current = false;
    }, [channelId]);

    return (
        <Animated.View style={[styles.animatedContainer, animatedStyle]}>
            <View style={[styles.container]}>
                <TouchableWithFeedback
                    type={'opacity'}
                    onPress={onPress}
                    underlayColor={underlayColor}
                    style={styles.pressContainer}
                    testID={testID}
                >
                    <>
                        <View style={styles.iconContainer}>
                            {loading &&
                                <ActivityIndicator
                                    animating={true}
                                    size='small'
                                    color={theme.buttonColor}
                                />
                            }
                            {!loading &&
                                <CompassIcon
                                    name='arrow-up'
                                    style={styles.icon}
                                />
                            }
                        </View>
                        <View style={styles.textContainer}>
                            <FormattedText
                                id='more_messages.text'
                                defaultMessage='{count} new {count, plural, one {message} other {messages}}'
                                style={styles.text}
                                values={{count: remaining}}
                            />
                        </View>
                    </>
                </TouchableWithFeedback>
                <TouchableWithFeedback
                    type='opacity'
                    onPress={onCancel}
                >
                    <View style={styles.cancelContainer}>
                        <CompassIcon
                            name='close'
                            style={[styles.icon, styles.closeIcon]}
                        />
                    </View>
                </TouchableWithFeedback>
            </View>
        </Animated.View>
    );
};

export default MoreMessages;
