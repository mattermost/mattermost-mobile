// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import ChannelInfo from '@app/components/post_with_channel_info/channel_info';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    channel: ChannelModel;
    draft: DraftModel;
}

const DraftPost: React.FC<Props> = ({
    channel,
    draft,
}) => {
    const post: Post = {
        id: draft.rootId || '',
        channel_id: channel.id,
        message: draft.message,
        create_at: 0,
        update_at: 0,
        delete_at: 0,
        user_id: '',
        root_id: draft.rootId || '',
        original_id: '',
        type: '',
        props: {},
        hashtags: '',
        pending_post_id: '',
        reply_count: 0,
        metadata: draft.metadata ? draft.metadata : {},
        edit_at: 0,
        is_pinned: false,
        file_ids: [draft.files.map((file) => file.id) || ''],
        last_reply_at: 0,
        message_source: '',
        user_activity_posts: [],
    };

    return (
        <View style={{height: 60}}>
            <ChannelInfo
                post={post}
                testID='draft.channel.info'
            />
            {/* <Text>{channel.displayName}</Text>
            <Text>{channel.type}</Text>
            <Text>{draft.rootId ? 'In Thread' : 'Channel'}</Text>
    */}
            <Text>{draft.message}</Text>
        </View>
    );
};

export default DraftPost;
