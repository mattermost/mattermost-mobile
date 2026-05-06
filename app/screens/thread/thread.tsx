// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View, type LayoutChangeEvent} from 'react-native';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {storeLastViewedThreadIdAndServer, removeLastViewedThreadIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import ChannelBanner from '@components/channel_banner';
import FreezeScreen from '@components/freeze_screen';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {General, Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useGlobalClassificationBanner} from '@hooks/use_global_classification_banner';
import {useIsScreenVisible} from '@hooks/use_screen_visibility';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';

import ThreadContent from './thread_content';
import ThreadFollowButton from './thread_follow_button';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type ThreadProps = {
    componentId: AvailableScreens;
    isCRTEnabled: boolean;
    channelDisplayName: string;
    channelType?: ChannelType;
    includeChannelBanner: boolean;
    showJoinCallBanner: boolean;
    isInACall: boolean;
    showIncomingCalls: boolean;
    rootId: string;
    rootPost?: PostModel;
    scheduledPostCount: number;
};

const styles = {flex: {flex: 1}} as const;

const Thread = ({
    componentId,
    isCRTEnabled,
    channelDisplayName,
    channelType,
    includeChannelBanner,
    rootId,
    rootPost,
    showJoinCallBanner,
    isInACall,
    showIncomingCalls,
    scheduledPostCount,
}: ThreadProps) => {
    const [containerHeight, setContainerHeight] = useState(0);
    const intl = useIntl();
    const isVisible = useIsScreenVisible(componentId);
    const isTablet = useIsTablet();
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = useState(false);
    const defaultHeight = useDefaultHeaderHeight();
    const {bannerHeight, BannerComponent} = useGlobalClassificationBanner();

    const safeAreaViewEdges: Edge[] = useMemo(() => {
        if (isTablet) {
            return ['left', 'right'];
        }
        if (isEmojiSearchFocused) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [isTablet, isEmojiSearchFocused]);

    const contextStyle = useMemo(() => ({
        top: defaultHeight + bannerHeight,
    }), [bannerHeight, defaultHeight]);

    const title = intl.formatMessage({id: 'thread.header.thread', defaultMessage: 'Thread'});

    const subtitle = useMemo(() => {
        if (!channelDisplayName) {
            return '';
        }
        if (channelType === General.DM_CHANNEL) {
            return channelDisplayName;
        }
        return intl.formatMessage(
            {id: 'thread.header.thread_in', defaultMessage: 'in {channelName}'},
            {channelName: channelDisplayName},
        );
    }, [channelDisplayName, channelType, intl]);

    const rightComponent = useMemo(() => {
        if (!isCRTEnabled || !rootId) {
            return undefined;
        }
        return (
            <ThreadFollowButton threadId={rootId}/>
        );
    }, [isCRTEnabled, rootId]);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        const isFromGlobalOrNotification = NavigationStore.getScreensInStack()[1] === Screens.GLOBAL_THREADS || NavigationStore.getScreensInStack()[1] === Screens.HOME;
        if (isCRTEnabled && isFromGlobalOrNotification) {
            storeLastViewedThreadIdAndServer(rootId);
        }

        return () => {
            if (isCRTEnabled) {
                removeLastViewedThreadIdAndServer();
            }
            if (rootId === EphemeralStore.getCurrentThreadId()) {
                EphemeralStore.setCurrentThreadId('');
            }
        };
    }, [rootId, componentId, isCRTEnabled]);

    useDidUpdate(() => {
        if (!rootPost) {
            close();
        }
    }, [componentId, rootPost]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const showFloatingCallContainer = showJoinCallBanner || isInACall || showIncomingCalls;

    return (
        <FreezeScreen>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={safeAreaViewEdges}
                testID='thread.screen'
                onLayout={onLayout}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <NavigationHeader
                    isLargeTitle={false}
                    onBackPress={close}
                    rightComponent={rightComponent}
                    title={title}
                    subtitle={subtitle}
                    classificationBanner={BannerComponent}
                />
                <View style={contextStyle}>
                    <RoundedHeaderContext/>
                </View>
                {includeChannelBanner && rootPost &&
                    <ChannelBanner
                        channelId={rootPost.channelId}
                        isTopItem={true}
                    />
                }
                {Boolean(rootPost) &&
                (Platform.OS === 'ios' ? (
                    <KeyboardProvider>
                        <ThreadContent
                            rootId={rootId}
                            rootPost={rootPost!}
                            scheduledPostCount={scheduledPostCount}
                            containerHeight={containerHeight}
                            enabled={isVisible}
                            onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                        />
                    </KeyboardProvider>
                ) : (
                    <ThreadContent
                        rootId={rootId}
                        rootPost={rootPost!}
                        scheduledPostCount={scheduledPostCount}
                        containerHeight={containerHeight}
                        enabled={isVisible}
                        onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                    />
                ))
                }
                {showFloatingCallContainer &&
                    <FloatingCallContainer
                        channelId={rootPost!.channelId}
                        showJoinCallBanner={showJoinCallBanner}
                        showIncomingCalls={showIncomingCalls}
                        isInACall={isInACall}
                        threadScreen={true}
                        includeChannelBanner={includeChannelBanner}
                    />
                }
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default Thread;
