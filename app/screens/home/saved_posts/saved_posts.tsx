// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {getSavedPosts} from '@actions/remote/post';
import {isDateLine, getDateForDateLine, selectOrderedPosts} from '@app/utils/post_list';
import Post from '@components/mini_post';
import DateSeparator from '@components/post_list/date_separator';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';

import EmptyState from './components/empty';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentTimezone: string | null;
    currentUser: UserModel;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
}

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
});

function SavedMessages({
    currentUser,
    posts,
    currentTimezone,
    isTimezoneEnabled,
}: Props) {
    const [loading, setLoading] = useState(!posts.length);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    useEffect(() => {
        getSavedPosts(serverUrl).finally(() => {
            setLoading(false);
        });
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await getSavedPosts(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

    const emptyList = useMemo(() => (
        <View style={styles.empty}>
            {loading ? (
                <ActivityIndicator
                    color={theme.centerChannelColor}
                    size='large'
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
        <SafeAreaView style={styles.flex}>
            <FlatList
                contentContainerStyle={styles.list}
                ListEmptyComponent={emptyList}
                data={data}
                indicatorStyle='black'
                onRefresh={handleRefresh}
                refreshing={refreshing}
                renderItem={renderItem}
                scrollToOverflowEnabled={true}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

export default SavedMessages;
