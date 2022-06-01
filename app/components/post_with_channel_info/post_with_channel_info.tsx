// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View, StyleSheet} from 'react-native';

import Post from '@components/post_list/post';

import ChannelInfo from './channel_info';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    isCRTEnabled: boolean;
    post: PostModel;
    location: string;
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

function PostWithChannelInfo({isCRTEnabled, post, location}: Props) {
    return (
        <View style={styles.container}>
            <ChannelInfo post={post}/>
            <View style={styles.content}>
                <Post
                    isCRTEnabled={isCRTEnabled}
                    post={post}
                    location={location}
                    highlightPinnedOrSaved={false}
                    skipPinnedHeader={true}
                    skipSavedHeader={true}
                    shouldRenderReplyButton={false}
                    showAddReaction={false}
                    previousPost={undefined}
                    nextPost={undefined}
                />
            </View>
        </View>
    );
}

export default memo(PostWithChannelInfo);
