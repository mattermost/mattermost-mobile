// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, type LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {storeLastViewedChannelIdAndServer, removeLastViewedChannelIdAndServer} from '@actions/app/global';
import {fetchPostsForChannel} from '@actions/remote/post';
import FloatingCallContainer from '@calls/components/floating_call_container';
import {Events, Screens} from '@constants';
import {isPlatformUiIos} from '@constants/platform_ui';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useChannelSwitch} from '@hooks/channel_switch';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useEnsureHiddenScrollEdgeEffects} from '@hooks/hide_scroll_edge_effects';
import {useSheetStyle} from '@hooks/sheet_style';
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
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const platformUi = isPlatformUiIos();
    const shouldRender = !switchingTeam && !switchingChannels && shouldRenderPosts && Boolean(channelId);

    // FlatList must exist when scrollEdgeEffects are applied (iOS 26 soft edges wash out posts).
    useEnsureHiddenScrollEdgeEffects(platformUi, shouldRender);
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
        if (platformUi) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [isTablet, platformUi]);

    useAndroidHardwareBackHandler(Screens.CHANNEL, navigateBack);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.POST_DELETED_FOR_CHANNEL, ({serverUrl: url, channelId: id}) => {
            if (serverUrl === url && channelId === id) {
                fetchPostsForChannel(serverUrl, channelId, false, true);
            }
        });
        return () => listener.remove();
    }, [serverUrl, channelId]);

    // Platform UI: keep the sheet top at the full header height so CHANNEL_SHEET_RADIUS is visible.
    // Legacy phone layout tucks content under the status-bar portion of the absolute header.
    const marginTop = defaultHeight + (isTablet || platformUi ? 0 : -insets.top);

    // Holds the sheet shape while content is gated so the push transition doesn't show a
    // bare sidebarBg screen and then pop the sheet in.
    const sheetPlaceholderStyle = useSheetStyle(marginTop);

    useEffect(() => {
        // Platform UI: mount FlatList immediately so RNSScreen can find it for scrollEdgeEffects.
        // Legacy: delay one frame so the absolute header paints first on blank screens.
        let raf: number | undefined;
        if (platformUi) {
            setShouldRenderPosts(Boolean(channelId));
        } else {
            raf = requestAnimationFrame(() => {
                setShouldRenderPosts(Boolean(channelId));
            });
        }

        // This is done to give time to the WS event
        const t = setTimeout(() => {
            EphemeralStore.removeSwitchingToChannel(channelId);
        }, 500);

        storeLastViewedChannelIdAndServer(channelId);

        return () => {
            if (raf !== undefined) {
                cancelAnimationFrame(raf);
            }
            clearTimeout(t);
            removeLastViewedChannelIdAndServer();
            EphemeralStore.removeSwitchingToChannel(channelId);
        };
    }, [channelId, platformUi]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const showFloatingCallContainer = showJoinCallBanner || isInACall || showIncomingCalls;

    return (
        <SafeAreaView
            style={[styles.flex, platformUi && {backgroundColor: theme.sidebarBg}]}
            edges={safeAreaViewEdges}
            testID='channel.screen'
            onLayout={onLayout}
        >
            {/* Before header: RNScreens finds FlatList via first-child chain (iOS 26 scroll-edge). */}
            {shouldRender ? (
                <ChannelContent
                    channelId={channelId}
                    marginTop={marginTop}
                    scheduledPostCount={scheduledPostCount}
                    containerHeight={containerHeight}
                    enabled={isVisible}
                    includeBookmarkBar={includeBookmarkBar}
                    includeChannelBanner={includeChannelBanner}
                />
            ) : platformUi && <View style={sheetPlaceholderStyle}/>}
            <ChannelHeader
                channelId={channelId}
                callsEnabledInChannel={isCallsEnabledInChannel}
                groupCallsAllowed={groupCallsAllowed}
                isTabletView={isTabletView}
                shouldRenderBookmarks={shouldRender}
                shouldRenderChannelBanner={includeChannelBanner}
            />
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
