// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';

import NavigationHeader from '@components/navigation_header';
import OtherMentionsBadge from '@components/other_mentions_badge';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {popTopScreen} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';

import ThreadFollowButton from './thread_follow_button';

import type {AvailableScreens} from '@typings/screens/navigation';

type ChannelProps = {
    channelId: string;
    threadId: string;
    componentId?: AvailableScreens;
    displayName?: string;
    isCRTEnabled?: boolean;
};

const ThreadHeader = ({
    channelId,
    threadId,
    componentId,
    displayName,
    isCRTEnabled,
}: ChannelProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const defaultHeight = useDefaultHeaderHeight();
    const contextStyle = useMemo(() => ({
        top: defaultHeight,
    }), [defaultHeight]);

    const mountedScreens = NavigationStore.getScreensInStack();
    const isChannelScreenMounted = mountedScreens.includes(Screens.CHANNEL);

    const leftComponent = useMemo(() => {
        if (isTablet || !channelId) {
            return undefined;
        }

        return (<OtherMentionsBadge channelId={isChannelScreenMounted ? channelId : ''}/>);
    }, [isTablet, channelId, isChannelScreenMounted]);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, [componentId]);

    const title = intl.formatMessage({id: 'thread.header.thread', defaultMessage: 'Thread'});
    const channelName = displayName || intl.formatMessage({id: 'thread.header.unknownChannel', defaultMessage: 'Unknown'});
    const subtitle = intl.formatMessage({id: 'thread.header.thread_in', defaultMessage: 'in {channelName}'}, {channelName});

    const followButton = isCRTEnabled ? <ThreadFollowButton threadId={threadId}/> : undefined;

    return (
        <>
            <NavigationHeader
                isLargeTitle={false}
                leftComponent={leftComponent}
                onBackPress={onBackPress}
                rightComponent={followButton}
                showBackButton={!isTablet}
                subtitle={subtitle}
                title={title}
            />
            <View style={contextStyle}>
                <RoundedHeaderContext/>
            </View>
        </>
    );
};

export default ThreadHeader;
