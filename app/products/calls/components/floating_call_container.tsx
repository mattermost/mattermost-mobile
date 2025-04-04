// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CurrentCallBar from '@calls/components/current_call_bar';
import {IncomingCallsContainer} from '@calls/components/incoming_calls_container';
import JoinCallBanner from '@calls/components/join_call_banner';
import {BOOKMARKS_BAR_HEIGHT, CHANNEL_BANNER_HEIGHT, DEFAULT_HEADER_HEIGHT, TABLET_HEADER_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';

const style = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        width: '100%',
        marginTop: 8,
        gap: 8,
    },
});

type Props = {
    channelId?: string;
    showJoinCallBanner?: boolean;
    showIncomingCalls?: boolean;
    isInACall?: boolean;
    threadScreen?: boolean;
    channelsScreen?: boolean;
    includeBookmarkBar?: boolean;
    includeChannelBanner?: boolean;
}

const FloatingCallContainer = ({
    channelId,
    showJoinCallBanner,
    showIncomingCalls,
    isInACall,
    threadScreen,
    channelsScreen,
    includeBookmarkBar,
    includeChannelBanner,
}: Props) => {
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const topBarForTablet = (isTablet && !threadScreen) ? TABLET_HEADER_HEIGHT : 0;
    const topBarChannel = (!isTablet && !threadScreen) ? DEFAULT_HEADER_HEIGHT : 0;
    const wrapperTop = {
        top: insets.top + topBarForTablet + topBarChannel + (includeBookmarkBar ? BOOKMARKS_BAR_HEIGHT : 0) + (includeChannelBanner ? CHANNEL_BANNER_HEIGHT : 0),
    };
    const wrapperBottom = {
        bottom: 8,
    };

    return (
        <View style={[style.wrapper, channelsScreen ? wrapperBottom : wrapperTop]}>
            {showJoinCallBanner && channelId &&
                <JoinCallBanner
                    serverUrl={serverUrl}
                    channelId={channelId}
                />
            }
            {isInACall && <CurrentCallBar/>}
            {showIncomingCalls &&
                <IncomingCallsContainer
                    channelId={channelId}
                />
            }
        </View>
    );
};

export default FloatingCallContainer;
