// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {ReactElement, useCallback} from 'react';
import {DeviceEventEmitter, FlatList, Platform, RefreshControl, StyleSheet, ViewToken} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import Post from '@components/post';
import {emptyFunction} from '@utils/general';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';

type RefreshProps = {
    children: ReactElement;
    enabled: boolean;
    onRefresh: () => void;
    refreshing: boolean;
}

type Props = {
    posts: PostModel[];
}

type ViewableItemsChanged = {
    viewableItems: ViewToken[];
    changed: ViewToken[];
}

const style = StyleSheet.create({
    container: {
        flex: 1,
        scaleY: -1,
    },
    scale: {
        ...Platform.select({
            android: {
                scaleY: -1,
            },
        }),
    },
});

export const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 1,
    minimumViewTime: 100,
};

const PostListRefreshControl = ({children, enabled, onRefresh, refreshing}: RefreshProps) => {
    const props = {
        onRefresh,
        refreshing,
    };

    if (Platform.OS === 'android') {
        return (
            <RefreshControl
                {...props}
                enabled={enabled}
                style={style.container}
            >
                {children}
            </RefreshControl>
        );
    }

    const refreshControl = <RefreshControl {...props}/>;

    return React.cloneElement(
        children,
        {refreshControl, inverted: true},
    );
};

const TempPostList = ({posts}: Props) => {
    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable) {
                acc[item.id] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit('scrolled', viewableItemsMap);
    }, []);

    const renderItem = useCallback(({item}) => {
        return (
            <Post
                key={item}
                post={item}
                location='Channel'
                style={style.scale}
            />
        );
    }, [posts]);

    return (
        <PostListRefreshControl
            enabled={false}
            refreshing={false}
            onRefresh={emptyFunction}
        >
            <FlatList
                data={posts}
                renderItem={renderItem}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                keyExtractor={(item) => item.id}
                style={{flex: 1}}
                contentContainerStyle={{paddingTop: 5}}
                initialNumToRender={10}
                maxToRenderPerBatch={Platform.select({android: 5})}
                removeClippedSubviews={true}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={VIEWABILITY_CONFIG}
                windowSize={30}
                scrollEventThrottle={60}
            />
        </PostListRefreshControl>
    );
};

const withPosts = withObservables(['channelId'], ({database, channelId}: {channelId: string} & WithDatabaseArgs) => ({
    posts: database.get(MM_TABLES.SERVER.POSTS_IN_CHANNEL).query(
        Q.where('channel_id', channelId),
        Q.experimentalSortBy('latest', Q.desc),
    ).observe().pipe(
        switchMap((postsInChannel: PostsInChannelModel[]) => {
            if (!postsInChannel.length) {
                return of$([]);
            }

            const {earliest, latest} = postsInChannel[0];
            return database.get(MM_TABLES.SERVER.POST).query(
                Q.and(
                    Q.where('delete_at', 0),
                    Q.where('channel_id', channelId),
                    Q.where('create_at', Q.between(earliest, latest)),
                ),
                Q.experimentalSortBy('create_at', Q.desc),
            ).observe();
        }),
    ),
}));

export default withDatabase(withPosts(React.memo(TempPostList)));
