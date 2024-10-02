// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import ChannelInfo from '../channel_info';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channel: ChannelModel;
    sendToUser?: UserModel;
    draft: DraftModel;
    currentUser: UserModel;
}

const style = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
});

const DraftPost: React.FC<Props> = ({
    channel,
    draft,

    // currentUser,
    sendToUser,
}) => {
    // const post: Post = {
    //     id: draft.rootId || '',
    //     channel_id: channel.id,
    //     message: draft.message,
    //     create_at: 0,
    //     update_at: 0,
    //     delete_at: 0,
    //     user_id: currentUser.id,
    //     root_id: draft.rootId || '',
    //     original_id: '',
    //     type: '',
    //     props: {},
    //     hashtags: '',
    //     pending_post_id: '',
    //     reply_count: 0,
    //     metadata: draft.metadata ? draft.metadata : {},
    //     edit_at: 0,
    //     is_pinned: false,
    //     file_ids: [draft.files.map((file) => file.id) || ''],
    //     last_reply_at: 0,
    //     message_source: '',
    //     user_activity_posts: [],
    // };

    return (
        <View style={style.container}>
            {/* <Text>{channel.displayName}</Text>
            <Text>{channel.type}</Text>
            <Text>{draft.rootId ? 'In Thread' : 'Channel'}</Text>
            */}
            <ChannelInfo
                channel={channel}
                sendToUser={sendToUser}
            />
            <Text>{draft.message}</Text>
        </View>
    );
};

export default DraftPost;
