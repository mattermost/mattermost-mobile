// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import CurrentCallBar from '@calls/components/current_call_bar';
import FloatingCallContainer from '@calls/components/floating_call_container';
import JoinCallBanner from '@calls/components/join_call_banner';
import FreezeScreen from '@components/freeze_screen';
import PostDraft from '@components/post_draft';
import {Screens} from '@constants';
import {ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useChannelSwitch} from '@hooks/channel_switch';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useKeyboardTrackingPaused} from '@hooks/keyboard_tracking';
import {useTeamSwitch} from '@hooks/team_switch';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import ChannelPostList from './channel_post_list';
import ChannelHeader from './header';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

type ChannelProps = {
    serverUrl: string;
    channelId: string;
    componentId?: AvailableScreens;
    isCallInCurrentChannel: boolean;
    isInACall: boolean;
    isInCurrentChannelCall: boolean;
    isCallsEnabledInChannel: boolean;
    isTabletView?: boolean;
};

const edges: Edge[] = ['left', 'right'];
const trackKeyboardForScreens = [Screens.HOME, Screens.CHANNEL];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const Channel = ({
    serverUrl,
    channelId,
    componentId,
    isCallInCurrentChannel,
    isInACall,
    isInCurrentChannelCall,
    isCallsEnabledInChannel,
    isTabletView,
}: ChannelProps) => {
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const [shouldRenderPosts, setShouldRenderPosts] = useState(false);
    const switchingTeam = useTeamSwitch();
    const switchingChannels = useChannelSwitch();
    const defaultHeight = useDefaultHeaderHeight();
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const shouldRender = !switchingTeam && !switchingChannels && shouldRenderPosts && Boolean(channelId);
    const handleBack = () => {
        popTopScreen(componentId);
    };

    useKeyboardTrackingPaused(postDraftRef, channelId, trackKeyboardForScreens);
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

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(t);
            EphemeralStore.removeSwitchingToChannel(channelId);
        };
    }, [channelId]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    let callsComponents: JSX.Element | null = null;
    const showJoinCallBanner = isCallInCurrentChannel && !isInCurrentChannelCall;
    if (showJoinCallBanner || isInACall) {
        callsComponents = (
            <FloatingCallContainer>
                {showJoinCallBanner &&
                    <JoinCallBanner
                        serverUrl={serverUrl}
                        channelId={channelId}
                    />
                }
                {isInACall && <CurrentCallBar/>}
            </FloatingCallContainer>
        );
    }

    return (
        <FreezeScreen>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
                testID='channel.screen'
                onLayout={onLayout}
            >
                <ChannelHeader
                    channelId={channelId}
                    componentId={componentId}
                    callsEnabledInChannel={isCallsEnabledInChannel}
                    isTabletView={isTabletView}
                />
                {shouldRender &&
                <>
                    <View style={[styles.flex, {marginTop}]}>
                        <ChannelPostList
                            channelId={channelId}
                            nativeID={channelId}
                            currentCallBarVisible={isInACall}
                            joinCallBannerVisible={showJoinCallBanner}
                        />
                    </View>
                    <PostDraft
                        channelId={channelId}
                        keyboardTracker={postDraftRef}
                        scrollViewNativeID={channelId}
                        accessoriesContainerID={ACCESSORIES_CONTAINER_NATIVE_ID}
                        testID='channel.post_draft'
                        containerHeight={containerHeight}
                        isChannelScreen={true}
                        canShowPostPriority={true}
                    />
                </>
                }
                {callsComponents}
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default Channel;
