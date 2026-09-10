// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useCallback, useEffect} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import Header from '@components/navigation_header/header';
import {HIDDEN_SCROLL_EDGE_EFFECTS, isPlatformUiIos} from '@constants/platform_ui';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {usePropsFromParams} from '@hooks/props_from_params';
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
    const platformUi = isPlatformUiIos();
    const {channelName, rootId, title: routeTitle} = usePropsFromParams<{channelName: string; rootId: string; title?: string}>();

    const title = routeTitle || intl.formatMessage(threadMessages.thread);
    const subtitle = channelName ? intl.formatMessage(threadMessages.threadIn, {channelName}) : undefined;

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        // Platform UI: keep stack header hidden so RNSScrollViewFinder reaches FlatList first.
        // Soft scroll-edge effects otherwise wash out the entire thread sheet on iOS 26.
        if (platformUi) {
            navigation.setOptions({
                headerShown: false,
                scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
                contentStyle: {backgroundColor: theme.centerChannelBg},
            });
            return;
        }

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
    }, [navigation, defaultHeight, handleBack, platformUi, subtitle, theme, title]);

    return (
        <ThreadScreen
            rootId={rootId}
            serverUrl={serverUrl}
            title={title}
            subtitle={subtitle}
        />
    );
}
