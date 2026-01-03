// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLocalSearchParams, useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import ThreadScreen from '@screens/thread';

const threadMessages = defineMessages({
    thread: {
        id: 'thread.header.thread',
        defaultMessage: 'Thread',
    },
    threadIn: {
        id: 'thread.header.thread_in',
        defaultMessage: 'in {channelName}',
    },
});

export default function ThreadRoute() {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const {channelName, rootId, title: routeTitle} = useLocalSearchParams<{channelName: string; rootId: string; title?: string}>();

    const title = routeTitle || intl.formatMessage(threadMessages.thread);
    const subtitle = channelName ? intl.formatMessage(threadMessages.threadIn, {channelName}) : undefined;

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            presentation: 'card',
            headerStyle: {
                backgroundColor: theme.sidebarBg,
            },
            headerTitle: () => {
                return (
                    <NavigationHeaderTitle
                        title={title}
                        subtitle={subtitle}
                    />
                );
            },
        });
    }, [navigation, title, subtitle, theme.sidebarBg, theme.centerChannelColor]);

    return (
        <ThreadScreen
            rootId={rootId}
            serverUrl={serverUrl}
        />
    );
}
