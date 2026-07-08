// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLocalSearchParams, useNavigation} from 'expo-router';
import {useCallback, useEffect} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import Header from '@components/navigation_header/header';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import ThreadScreen from '@screens/thread';

import type {NativeStackHeaderProps} from '@react-navigation/native-stack';

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
    const defaultHeight = useDefaultHeaderHeight();
    const {channelName, rootId, title: routeTitle} = useLocalSearchParams<{channelName: string; rootId: string; title?: string}>();

    const title = routeTitle || intl.formatMessage(threadMessages.thread);
    const subtitle = channelName ? intl.formatMessage(threadMessages.threadIn, {channelName}) : undefined;

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            presentation: 'card',
            header: ({options}: NativeStackHeaderProps) => (
                <Header
                    defaultHeight={defaultHeight}
                    hasSearch={false}
                    isLargeTitle={false}
                    heightOffset={0}
                    onBackPress={handleBack}
                    rightComponent={options.headerRight?.({canGoBack: true})}
                    subtitle={subtitle}
                    theme={theme}
                    title={title}
                />
            ),
        });
    }, [navigation, defaultHeight, handleBack, subtitle, theme, title]);

    return (
        <ThreadScreen
            rootId={rootId}
            serverUrl={serverUrl}
        />
    );
}
