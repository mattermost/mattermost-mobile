// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {Platform, type LayoutChangeEvent, StyleSheet} from 'react-native';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {storeLastViewedChannelIdAndServer, removeLastViewedChannelIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import FreezeScreen from '@components/freeze_screen';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useChannelSwitch} from '@hooks/channel_switch';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import {useIsScreenVisible} from '@hooks/use_screen_visibility';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import ChannelContent from './channel_content';
import ChannelHeader from './header';
import useGMasDMNotice from './use_gm_as_dm_notice';

import type PreferenceModel from '@typings/database/models/servers/preference';
import type {AvailableScreens} from '@typings/screens/navigation';

type ChannelProps = {
    channelId: string;
    componentId?: AvailableScreens;
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

const edges: Edge[] = ['left', 'right', 'bottom'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const Channel = ({
    channelId,
    componentId,
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
    const isVisible = useIsScreenVisible(componentId);
    const handleBack = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, handleBack);

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
        <FreezeScreen>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
                testID='channel.screen'
                onLayout={onLayout}
                nativeID={componentId ? SecurityManager.getShieldScreenId(componentId) : undefined}
            >
                <ChannelHeader
                    channelId={channelId}
                    componentId={componentId}
                    callsEnabledInChannel={isCallsEnabledInChannel}
                    groupCallsAllowed={groupCallsAllowed}
                    isTabletView={isTabletView}
                    shouldRenderBookmarks={shouldRender}
                    shouldRenderChannelBanner={includeChannelBanner}
                />
                {shouldRender &&
                (Platform.OS === 'ios' ? (
                    <KeyboardProvider>
                        <ChannelContent
                            channelId={channelId}
                            marginTop={marginTop}
                            scheduledPostCount={scheduledPostCount}
                            containerHeight={containerHeight}
                            enabled={isVisible}
                        />
                    </KeyboardProvider>
                ) : (
                    <ChannelContent
                        channelId={channelId}
                        marginTop={marginTop}
                        scheduledPostCount={scheduledPostCount}
                        containerHeight={containerHeight}
                        enabled={isVisible}
                    />
                ))
                }
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
        </FreezeScreen>
    );
};

export default Channel;
