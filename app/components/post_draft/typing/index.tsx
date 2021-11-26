// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useRef, useState} from 'react';
import {
    DeviceEventEmitter,
    Platform,
    Text,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {Events} from '@constants';
import {TYPING_HEIGHT} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    channelId: string;
    rootId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        typing: {
            position: 'absolute',
            paddingLeft: 10,
            paddingTop: 3,
            fontSize: 11,
            ...Platform.select({
                android: {
                    marginBottom: 5,
                },
                ios: {
                    marginBottom: 2,
                },
            }),
            color: theme.centerChannelColor,
            backgroundColor: 'transparent',
        },
    };
});

export default function Typing({
    channelId,
    rootId,
}: Props) {
    const typingHeight = useSharedValue(0);
    const typing = useRef<Array<{id: string; now: number; username: string}>>([]);
    const [refresh, setRefresh] = useState(0);

    const theme = useTheme();
    const style = getStyleSheet(theme);

    const typingAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(typingHeight.value),
        };
    });

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.USER_TYPING, (msg: any) => {
            if (channelId !== msg.channelId) {
                return;
            }

            const msgRootId = msg.parentId || '';
            if (rootId !== msgRootId) {
                return;
            }

            typing.current = typing.current.filter(({id}) => id !== msg.userId); //eslint-disable-line max-nested-callbacks
            typing.current.push({id: msg.userId, now: msg.now, username: msg.username});
            setRefresh(Date.now());
        });
        return () => {
            listener.remove();
        };
    }, [channelId, rootId]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.USER_STOP_TYPING, (msg: any) => {
            if (channelId !== msg.channelId) {
                return;
            }

            const msgRootId = msg.parentId || '';
            if (rootId !== msgRootId) {
                return;
            }

            typing.current = typing.current.filter(({id, now}) => id !== msg.userId && now !== msg.now);//eslint-disable-line max-nested-callbacks
            setRefresh(Date.now());
        });
        return () => {
            listener.remove();
        };
    }, [channelId, rootId]);

    useEffect(() => {
        typingHeight.value = typing.current.length ? TYPING_HEIGHT : 0;
    }, [refresh]);

    const renderTyping = () => {
        const nextTyping = typing.current.map(({username}) => username);
        const numUsers = nextTyping.length;

        switch (numUsers) {
            case 0:
                return null;
            case 1:
                return (
                    <FormattedText
                        id='msg_typing.isTyping'
                        defaultMessage='{user} is typing...'
                        values={{
                            user: nextTyping[0],
                        }}
                    />
                );
            default: {
                const last = nextTyping.pop();
                return (
                    <FormattedText
                        id='msg_typing.areTyping'
                        defaultMessage='{users} and {last} are typing...'
                        values={{
                            users: (nextTyping.join(', ')),
                            last,
                        }}
                    />
                );
            }
        }
    };

    return (
        <Animated.View style={typingAnimatedStyle}>
            <Text
                style={style.typing}
                ellipsizeMode='tail'
                numberOfLines={1}
            >
                {renderTyping()}
            </Text>
        </Animated.View>
    );
}
