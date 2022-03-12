// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, StyleSheet, View} from 'react-native';
import {EventSubscription, Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchSavedPosts} from '@actions/remote/post';
import Loading from '@components/loading';
import Post from '@components/mini_post';
import DateSeparator from '@components/post_list/date_separator';
import TabletTitle from '@components/tablet_title';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissModal} from '@screens/navigation';
import {isDateLine, getDateForDateLine, selectOrderedPosts} from '@utils/post_list';

import EmptyState from './components/empty';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    componentId?: string;
    closeButtonId?: string;
    currentTimezone: string | null;
    currentUser: UserModel;
    isTimezoneEnabled: boolean;
    isTablet?: boolean;
    posts: PostModel[];
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    empty: {
        alignItems: 'center',
        minHeight: '100%',
        justifyContent: 'center',
    },
    list: {
        paddingVertical: 8,
    },
    loading: {
        height: 40,
        width: 40,
        justifyContent: 'center' as const,
    },
});

function SavedMessages({
    componentId,
    closeButtonId,
    currentUser,
    posts,
    currentTimezone,
    isTimezoneEnabled,
    isTablet,
}: Props) {
    const intl = useIntl();
    const [loading, setLoading] = useState(!posts.length);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    useEffect(() => {
        fetchSavedPosts(serverUrl).finally(() => {
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        let unsubscribe: EventSubscription | undefined;
        if (componentId && closeButtonId) {
            unsubscribe = Navigation.events().registerComponentListener({
                navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                    switch (buttonId) {
                        case closeButtonId:
                            dismissModal({componentId});
                            break;
                    }
                },
            }, componentId);
        }

        return () => {
            unsubscribe?.remove();
        };
    }, [componentId, closeButtonId]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchSavedPosts(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

    const emptyList = useMemo(() => (
        <View style={styles.empty}>
            {loading ? (
                <Loading
                    color={theme.buttonBg}
                    style={styles.loading}
                />
            ) : (
                <EmptyState/>
            )}
        </View>
    ), [loading, theme.centerChannelColor]);

    const renderItem = useCallback(({item}) => {
        if (typeof item === 'string') {
            if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        theme={theme}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            }
            return null;
        }

        return (
            <Post
                currentUser={currentUser}
                post={item}
            />
        );
    }, [currentUser, currentTimezone, isTimezoneEnabled, theme]);

    return (
        <>
            {isTablet &&
            <TabletTitle
                testID='custom_status.done.button'
                title={intl.formatMessage({id: 'mobile.screen.saved_posts', defaultMessage: 'Saved Messages'})}
            />
            }
            <SafeAreaView
                edges={edges}
                style={styles.flex}
            >
                <FlatList
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={emptyList}
                    data={data}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    renderItem={renderItem}
                    scrollToOverflowEnabled={true}
                />
            </SafeAreaView>
        </>
    );
}

export default SavedMessages;
