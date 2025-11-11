// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming} from 'react-native-reanimated';

import {Events} from '@constants';
import {TYPING_HEIGHT} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    channelId: string;
    rootId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 4,
            alignItems: 'flex-start',
        },
        bubble: {

        },
        typing: {
            color: changeOpacity(theme.centerChannelColor, 0.85),
            ...typography('Body', 100),
        },
        dotsContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 4,
        },
        dot: {
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.85),
            marginHorizontal: 2,
        },
        animatedContainer: {
            overflow: 'hidden',
            backgroundColor: 'transparent',
        },
    };
});

function Typing({
    channelId,
    rootId,
}: Props) {
    const typingHeight = useSharedValue(0);
    const typing = useRef<Array<{id: string; now: number; username: string}>>([]);
    const timeoutToDisappear = useRef<NodeJS.Timeout>();
    const mounted = useRef(false);
    const [refresh, setRefresh] = useState(0);

    const theme = useTheme();
    const style = getStyleSheet(theme);

    // Animated dots for typing indicator
    const dot1Opacity = useSharedValue(0.3);
    const dot2Opacity = useSharedValue(0.3);
    const dot3Opacity = useSharedValue(0.3);

    useEffect(() => {
        // Animate dots in sequence
        dot1Opacity.value = withRepeat(
            withSequence(
                withTiming(1, {duration: 400}),
                withTiming(0.3, {duration: 400}),
            ),
            -1,
            false,
        );
        dot2Opacity.value = withRepeat(
            withSequence(
                withTiming(0.3, {duration: 400}),
                withTiming(1, {duration: 400}),
                withTiming(0.3, {duration: 400}),
            ),
            -1,
            false,
        );
        dot3Opacity.value = withRepeat(
            withSequence(
                withTiming(0.3, {duration: 400}),
                withTiming(0.3, {duration: 400}),
                withTiming(1, {duration: 400}),
                withTiming(0.3, {duration: 400}),
            ),
            -1,
            false,
        );
    }, [dot1Opacity, dot2Opacity, dot3Opacity]);

    const dot1Style = useAnimatedStyle(() => ({
        opacity: dot1Opacity.value,
    }));

    const dot2Style = useAnimatedStyle(() => ({
        opacity: dot2Opacity.value,
    }));

    const dot3Style = useAnimatedStyle(() => ({
        opacity: dot3Opacity.value,
    }));

    // This moves the list of post up. This may be rethought by UX in https://mattermost.atlassian.net/browse/MM-39681
    const typingAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(typingHeight.value),
            marginBottom: 4,
        };
    });

    const onUserStartTyping = useCallback((msg: any) => {
        if (channelId !== msg.channelId) {
            return;
        }

        const msgRootId = msg.parentId || msg.rootId || '';
        if (rootId !== msgRootId) {
            return;
        }

        typing.current = typing.current.filter(({id}) => id !== msg.userId);
        typing.current.push({id: msg.userId, now: msg.now, username: msg.username});
        if (timeoutToDisappear.current) {
            clearTimeout(timeoutToDisappear.current);
            timeoutToDisappear.current = undefined;
        }
        if (mounted.current) {
            setRefresh(Date.now());
        }
    }, [channelId, rootId]);

    const onUserStopTyping = useCallback((msg: any) => {
        if (channelId !== msg.channelId) {
            return;
        }

        const msgRootId = msg.parentId || msg.rootId || '';
        if (rootId !== msgRootId) {
            return;
        }

        typing.current = typing.current.filter(({id, now}) => id !== msg.userId && now !== msg.now);

        if (timeoutToDisappear.current) {
            clearTimeout(timeoutToDisappear.current);
            timeoutToDisappear.current = undefined;
        }

        if (typing.current.length === 0) {
            timeoutToDisappear.current = setTimeout(() => {
                if (mounted.current) {
                    setRefresh(Date.now());
                }
                timeoutToDisappear.current = undefined;
            }, 500);
        } else if (mounted.current) {
            setRefresh(Date.now());
        }
    }, [channelId, rootId]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.USER_TYPING, onUserStartTyping);
        return () => {
            listener.remove();
        };
    }, [onUserStartTyping]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.USER_STOP_TYPING, onUserStopTyping);
        return () => {
            listener.remove();
        };
    }, [onUserStopTyping]);

    useEffect(() => {
        typingHeight.value = typing.current.length ? TYPING_HEIGHT : 0;
    }, [refresh, typingHeight]);

    useEffect(() => {
        typing.current = [];
        typingHeight.value = 0;
        if (timeoutToDisappear.current) {
            clearTimeout(timeoutToDisappear.current);
            timeoutToDisappear.current = undefined;
        }
    }, [channelId, rootId, typingHeight]);

    const renderTyping = () => {
        const nextTyping = typing.current.map(({username}) => username);

        // Max three names
        nextTyping.splice(3);

        const numUsers = nextTyping.length;

        switch (numUsers) {
            case 0:
                return null;
            case 1:
                return (
                    <View style={style.container}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text
                                style={style.typing}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                {`${nextTyping[0]} is typing`}
                            </Text>
                            <View style={style.dotsContainer}>
                                <Animated.View style={[style.dot, dot1Style]}/>
                                <Animated.View style={[style.dot, dot2Style]}/>
                                <Animated.View style={[style.dot, dot3Style]}/>
                            </View>
                        </View>
                    </View>
                );
            default: {
                const last = nextTyping.pop();
                return (
                    <View style={style.container}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text
                                style={style.typing}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                {`${nextTyping.join(', ')} and ${last} are typing`}
                            </Text>
                            <View style={style.dotsContainer}>
                                <Animated.View style={[style.dot, dot1Style]}/>
                                <Animated.View style={[style.dot, dot2Style]}/>
                                <Animated.View style={[style.dot, dot3Style]}/>
                            </View>
                        </View>
                    </View>
                );
            }
        }
    };

    return (
        <Animated.View style={[typingAnimatedStyle, style.animatedContainer]}>
            {renderTyping()}
        </Animated.View>
    );
}

export default React.memo(Typing);

