// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useLocalSearchParams, useNavigation} from 'expo-router';
import {useCallback, useEffect} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import NavigationHeaderTitle from '@components/navigation_header_title';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {DEFAULT_HEADER_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
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

const hitSlop = {top: 20, bottom: 20, left: 20, right: 20};

const headerStyles = StyleSheet.create({
    row: {
        height: DEFAULT_HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    titleContainer: {
        flex: 1,
        marginLeft: Platform.select({android: 20, ios: 8}),
    },
});

export default function ThreadRoute() {
    const navigation = useNavigation();
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
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
                <View style={{backgroundColor: theme.sidebarBg, paddingTop: insets.top}}>
                    <View style={headerStyles.row}>
                        <TouchableWithFeedback
                            borderlessRipple={true}
                            onPress={handleBack}
                            rippleRadius={20}
                            type={Platform.select({android: 'native', default: 'opacity'})}
                            testID='navigation.header.back'
                            hitSlop={hitSlop}
                        >
                            <CompassIcon
                                size={24}
                                name={Platform.select({android: 'arrow-left', ios: 'arrow-back-ios'})!}
                                color={theme.sidebarHeaderTextColor}
                            />
                        </TouchableWithFeedback>
                        <View style={headerStyles.titleContainer}>
                            <NavigationHeaderTitle
                                title={title}
                                subtitle={subtitle}
                            />
                        </View>
                        {options.headerRight?.({canGoBack: true})}
                    </View>
                </View>
            ),
        });
    }, [navigation, title, subtitle, theme.sidebarBg, theme.sidebarHeaderTextColor, insets.top, handleBack]);

    return (
        <ThreadScreen
            rootId={rootId}
            serverUrl={serverUrl}
        />
    );
}
