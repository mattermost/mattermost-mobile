// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CurrentCallBar from '@calls/components/current_call_bar';
import {IncomingCallsContainer} from '@calls/components/incoming_calls_container';
import JoinCallBanner from '@calls/components/join_call_banner';
import {DEFAULT_HEADER_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';

const topBarHeight = DEFAULT_HEADER_HEIGHT;

const style = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        width: '100%',
        marginTop: 8,
        gap: 8,
    },
});

type Props = {
    channelId: string;
    showJoinCallBanner: boolean;
    showIncomingCalls: boolean;
    isInACall: boolean;
    threadScreen?: boolean;
}

const FloatingCallContainer = ({channelId, showJoinCallBanner, showIncomingCalls, isInACall, threadScreen}: Props) => {
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const wrapperTop = {
        top: insets.top + (threadScreen ? 0 : topBarHeight),
    };

    return (
        <View style={[style.wrapper, wrapperTop]}>
            {showJoinCallBanner &&
                <JoinCallBanner
                    serverUrl={serverUrl}
                    channelId={channelId}
                />
            }
            {isInACall && <CurrentCallBar/>}
            {showIncomingCalls &&
                <IncomingCallsContainer
                    channelId={channelId}
                />}
        </View>
    );
};

export default FloatingCallContainer;
