// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, DeviceEventEmitter, Platform, View, ViewToken} from 'react-native';
import Animated, {interpolate, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';

import {resetMessageCount} from '@actions/local/channel';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {makeStyleSheetFromTheme, hexToHue} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channelId: string;
    isManualUnread: boolean;
    newMessageLineIndex: number;
    posts: Array<string | PostModel>;
    registerScrollEndIndexListener: (fn: (endIndex: number) => void) => () => void;
    registerViewableItemsListener: (fn: (viewableItems: ViewToken[]) => void) => () => void;
    scrollToIndex: (index: number, animated?: boolean, applyOffset?: boolean) => void;
    unreadCount: number;
    theme: Theme;
    testID: string;
}

const HIDDEN_TOP = -60;
const SHOWN_TOP = Platform.select({ios: 40, default: 0});
const MIN_INPUT = 0;
const MAX_INPUT = 1;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        animatedContainer: {
            position: 'absolute',
            margin: 8,
            backgroundColor: theme.buttonBg,
        },
        cancelContainer: {
            alignItems: 'center',
            width: 32,
            height: '100%',
            justifyContent: 'center',
        },
        container: {
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            paddingLeft: 12,
            width: '100%',
            height: 42,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowOpacity: 0.12,
            shadowRadius: 4,
        },
        roundBorder: {
            borderRadius: 8,
        },
        icon: {
            fontSize: 18,
            color: theme.buttonColor,
            alignSelf: 'center',
        },
        iconContainer: {
            top: 2,
            width: 22,
        },
        pressContainer: {
            flex: 1,
            flexDirection: 'row',
        },
        textContainer: {
            paddingLeft: 4,
        },
        text: {
            color: theme.buttonColor,
            ...typography('Body', 200, 'SemiBold'),
        },
    };
});

const MoreMessages = ({
    channelId,
    isManualUnread,
    newMessageLineIndex,
    posts,
    registerViewableItemsListener,
    registerScrollEndIndexListener,
    scrollToIndex,
    unreadCount,
    testID,
    theme,
}: Props) => {
    const serverUrl = useServerUrl();
    const pressed = useRef(false);
    const resetting = useRef(false);
    const initialScroll = useRef(false);
    const [loading, setLoading] = useState(false);
    const [remaining, setRemaining] = useState(0);
    const underlayColor = useMemo(() => `hsl(${hexToHue(theme.buttonBg)}, 50%, 38%)`, [theme]);
    const top = useSharedValue(0);
    const BARS_FACTOR = Math.abs((1) / (HIDDEN_TOP - SHOWN_TOP));
    const styles = getStyleSheet(theme);
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
                    SHOWN_TOP,
                    SHOWN_TOP,
                ],
                Animated.Extrapolate.CLAMP,
            ), {damping: 15}),
        }],
    }), []);

    const resetCount = async () => {
        if (resetting.current) {
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

        const readCount = posts.slice(0, lastViewableIndex).filter((v) => typeof v !== 'string').length;
        const totalUnread = unreadCount - readCount;
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

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.LOADING_CHANNEL_POSTS, (value: boolean) => {
            setLoading(value);
        });

        return () => listener.remove();
    }, []);

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
        <Animated.View style={[styles.animatedContainer, styles.roundBorder, animatedStyle]}>
            <View style={styles.container}>
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
                            style={styles.icon}
                        />
                    </View>
                </TouchableWithFeedback>
            </View>
        </Animated.View>
    );
};

export default MoreMessages;
