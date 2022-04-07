// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Keyboard, Platform, StyleSheet, View} from 'react-native';
import {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import FreezeScreen from '@components/freeze_screen';
import NavigationHeader from '@components/navigation_header';
import PostDraft from '@components/post_draft';
import {Events, Navigation} from '@constants';
import {ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {useAppState, useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

import ChannelPostList from './channel_post_list';
import OtherMentionsBadge from './other_mentions_badge';

import type {HeaderRightButton} from '@components/navigation_header/header';

type ChannelProps = {
    channelId: string;
    componentId?: string;
    displayName: string;
    isOwnDirectMessage: boolean;
    memberCount: number;
    name: string;
    teamId: string;
};

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const Channel = ({channelId, componentId, displayName, isOwnDirectMessage, memberCount, name, teamId}: ChannelProps) => {
    const {formatMessage} = useIntl();
    const appState = useAppState();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);
    const rightButtons: HeaderRightButton[] = useMemo(() => ([{
        iconName: 'magnify',
        onPress: () => {
            DeviceEventEmitter.emit(Navigation.NAVIGATE_TO_TAB, {screen: 'Search', params: {searchTerm: `in: ${name}`}});
            if (!isTablet) {
                popTopScreen(componentId);
            }
        },
    }, {
        iconName: Platform.select({android: 'dots-vertical', default: 'dots-horizontal'}),
        onPress: () => true,
        buttonType: 'opacity',
    }]), [channelId, isTablet, name]);

    const leftComponent = useMemo(() => {
        if (isTablet || !channelId || !teamId) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={channelId}/>);
    }, [isTablet, channelId, teamId]);

    const subtitleCompanion = useMemo(() => (
        <CompassIcon
            color={changeOpacity(theme.sidebarHeaderTextColor, 0.72)}
            name='chevron-right'
            size={14}
        />
    ), []);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, []);

    const onTitlePress = useCallback(() => {
        // eslint-disable-next-line no-console
        console.log('Title Press go to Channel Info', displayName);
    }, [channelId]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.PAUSE_KEYBOARD_TRACKING_VIEW, (pause: boolean) => {
            if (pause) {
                postDraftRef.current?.pauseTracking(channelId);
                return;
            }

            postDraftRef.current?.resumeTracking(channelId);
        });

        return () => listener.remove();
    }, []);

    let title = displayName;
    if (isOwnDirectMessage) {
        title = formatMessage({id: 'channel_header.directchannel.you', defaultMessage: '{displayName} (you)'}, {displayName});
    }

    const marginTop = defaultHeight + (isTablet ? insets.top : 0);
    const channelIsSet = Boolean(channelId);

    return (
        <FreezeScreen>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
                testID='channel.screen'
            >
                <NavigationHeader
                    isLargeTitle={false}
                    leftComponent={leftComponent}
                    onBackPress={onBackPress}
                    onTitlePress={onTitlePress}
                    rightButtons={rightButtons}
                    showBackButton={!isTablet}
                    subtitle={formatMessage({id: 'channel', defaultMessage: '{count, plural, one {# member} other {# members}}'}, {count: memberCount})}
                    subtitleCompanion={subtitleCompanion}
                    title={title}
                />
                {channelIsSet &&
                <>
                    <View style={[styles.flex, {marginTop}]}>
                        <ChannelPostList
                            channelId={channelId}
                            forceQueryAfterAppState={appState}
                            nativeID={channelId}
                        />
                    </View>
                    <PostDraft
                        channelId={channelId}
                        keyboardTracker={postDraftRef}
                        scrollViewNativeID={channelId}
                        accessoriesContainerID={ACCESSORIES_CONTAINER_NATIVE_ID}
                    />
                </>
                }
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default Channel;
