// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View, StyleSheet} from 'react-native';

import Post from '@components/post_list/post';

import ChannelInfo from './channel_info';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {SearchPattern} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    appsEnabled: boolean;
    currentUser: UserModel;
    customEmojiNames: string[];
    isCRTEnabled: boolean;
    post: PostModel;
    location: AvailableScreens;
    testID?: string;
    searchPatterns?: SearchPattern[];
    skipSavedPostsHighlight?: boolean;
    isSaved?: boolean;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 0,
    },
    content: {
        flexDirection: 'row',
        paddingBottom: 8,
    },
});

function PostWithChannelInfo({appsEnabled, currentUser, customEmojiNames, isCRTEnabled, post, location, testID, searchPatterns, skipSavedPostsHighlight = false, isSaved}: Props) {
    return (
        <View style={styles.container}>
            <ChannelInfo
                post={post}
                testID={`${testID}.post_channel_info.${post.id}`}
            />
            <View style={styles.content}>
                <Post
                    appsEnabled={appsEnabled}
                    currentUser={currentUser}
                    customEmojiNames={customEmojiNames}
                    isCRTEnabled={isCRTEnabled}
                    post={post}
                    location={location}
                    highlightPinnedOrSaved={!skipSavedPostsHighlight}
                    searchPatterns={searchPatterns}
                    skipPinnedHeader={true}
                    skipSavedHeader={skipSavedPostsHighlight}
                    shouldRenderReplyButton={false}
                    showAddReaction={false}
                    previousPost={undefined}
                    nextPost={undefined}
                    testID={`${testID}.post`}
                    isSaved={isSaved}
                />
            </View>
        </View>
    );
}

export default memo(PostWithChannelInfo);
