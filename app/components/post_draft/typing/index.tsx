// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import FormattedText from '@components/formatted_text';
import StatusIndicator from '@components/post_draft/status_indicator';
import {Events} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    channelId: string;
    rootId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        typing: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            paddingHorizontal: 10,
            ...typography('Body', 75),
        },
    };
});

function Typing({
    channelId,
    rootId,
}: Props) {
    const typing = useRef<Array<{id: string; now: number; username: string}>>([]);
    const timeoutToDisappear = useRef<NodeJS.Timeout>();
    const mounted = useRef(false);
    const [refresh, setRefresh] = useState(0);

    const theme = useTheme();
    const style = getStyleSheet(theme);

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
        typing.current = [];
        if (timeoutToDisappear.current) {
            clearTimeout(timeoutToDisappear.current);
            timeoutToDisappear.current = undefined;
        }
    }, [channelId, rootId]);

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
                    <FormattedText
                        id='msg_typing.isTyping'
                        defaultMessage='{user} is typing...'
                        style={style.typing}
                        ellipsizeMode='tail'
                        numberOfLines={1}
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
                        style={style.typing}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        values={{
                            users: (nextTyping.join(', ')),
                            last,
                        }}
                    />
                );
            }
        }
    };

    // Force re-render to get current typing count
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = refresh;
    const isVisible = typing.current.length > 0;

    return (
        <StatusIndicator visible={isVisible}>
            {renderTyping()}
        </StatusIndicator>
    );
}

export default React.memo(Typing);
