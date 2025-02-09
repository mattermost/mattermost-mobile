// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text} from 'react-native';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

type Props = {
    allScheduledPosts: ScheduledPostModel[];
    location: string;
    tutorialWatched: boolean;
};

const GlobalScheduledPostList: React.FC<Props> = ({
    allScheduledPosts,
}) => {
    return (
        <View>
            {allScheduledPosts.map((post) => (
                <View key={post.id}>
                    <Text>{post.id}</Text>
                </View>
            ))}
        </View>
    );
};

export default GlobalScheduledPostList;
