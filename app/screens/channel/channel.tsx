// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {type LayoutChangeEvent, StyleSheet} from 'react-native';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {storeLastViewedChannelIdAndServer, removeLastViewedChannelIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useChannelSwitch} from '@hooks/channel_switch';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import {navigateBack} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {useCurrentScreen} from '@store/navigation_store';

import ChannelContent from './channel_content';
import ChannelHeader from './header';
import useGMasDMNotice from './use_gm_as_dm_notice';

import type PreferenceModel from '@typings/database/models/servers/preference';

type ChannelProps = {
    channelId: string;
    showJoinCallBanner: boolean;
    isInACall: boolean;
    isCallsEnabledInChannel: boolean;
    groupCallsAllowed: boolean;
    showIncomingCalls: boolean;
    isTabletView?: boolean;
    dismissedGMasDMNotice: PreferenceModel[];
    currentUserId: string;
    channelType: ChannelType;
    hasGMasDMFeature: boolean;
    includeBookmarkBar?: boolean;
    includeChannelBanner: boolean;
    scheduledPostCount: number;
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const Channel = ({
    channelId,
    showJoinCallBanner,
    isInACall,
    isCallsEnabledInChannel,
    groupCallsAllowed,
    showIncomingCalls,
    isTabletView,
    dismissedGMasDMNotice,
    channelType,
    currentUserId,
    hasGMasDMFeature,
    includeBookmarkBar,
    includeChannelBanner,
    scheduledPostCount,
}: ChannelProps) => {
    useGMasDMNotice(currentUserId, channelType, dismissedGMasDMNotice, hasGMasDMFeature);
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const [shouldRenderPosts, setShouldRenderPosts] = useState(false);
    const switchingTeam = useTeamSwitch();
    const switchingChannels = useChannelSwitch();
    const defaultHeight = useDefaultHeaderHeight();
    const [containerHeight, setContainerHeight] = useState(0);
    const shouldRender = !switchingTeam && !switchingChannels && shouldRenderPosts && Boolean(channelId);
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = useState(false);
    const currentScreen = useCurrentScreen();
    const isVisible = useMemo(() => {
        if (isTablet) {
            return currentScreen === Screens.CHANNEL_LIST;
        }

        return currentScreen === Screens.CHANNEL;
    }, [currentScreen, isTablet]);

    const safeAreaViewEdges: Edge[] = useMemo(() => {
        if (isTablet) {
            return ['left', 'right'];
        }
        if (isEmojiSearchFocused) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [isTablet, isEmojiSearchFocused]);

    useAndroidHardwareBackHandler(Screens.CHANNEL, navigateBack);

    const marginTop = defaultHeight + (isTablet ? 0 : -insets.top);
    useEffect(() => {
        // This is done so that the header renders
        // and the screen does not look totally blank
        const raf = requestAnimationFrame(() => {
            setShouldRenderPosts(Boolean(channelId));
        });

        // This is done to give time to the WS event
        const t = setTimeout(() => {
            EphemeralStore.removeSwitchingToChannel(channelId);
        }, 500);

        storeLastViewedChannelIdAndServer(channelId);

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(t);
            removeLastViewedChannelIdAndServer();
            EphemeralStore.removeSwitchingToChannel(channelId);
        };
    }, [channelId]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const showFloatingCallContainer = showJoinCallBanner || isInACall || showIncomingCalls;

    return (
        <SafeAreaView
            style={styles.flex}
            edges={safeAreaViewEdges}
            testID='channel.screen'
            onLayout={onLayout}
        >
            <ChannelHeader
                channelId={channelId}
                callsEnabledInChannel={isCallsEnabledInChannel}
                groupCallsAllowed={groupCallsAllowed}
                isTabletView={isTabletView}
                shouldRenderBookmarks={shouldRender}
                shouldRenderChannelBanner={includeChannelBanner}
            />
            {shouldRender && (
                <ChannelContent
                    channelId={channelId}
                    marginTop={marginTop}
                    scheduledPostCount={scheduledPostCount}
                    containerHeight={containerHeight}
                    enabled={isVisible || shouldRender}
                    onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                />
            )}
            {showFloatingCallContainer && shouldRender &&
            <FloatingCallContainer
                channelId={channelId}
                showJoinCallBanner={showJoinCallBanner}
                showIncomingCalls={showIncomingCalls}
                isInACall={isInACall}
                includeBookmarkBar={includeBookmarkBar}
                includeChannelBanner={includeChannelBanner}
            />
            }
        </SafeAreaView>
    );
};

export default Channel;
