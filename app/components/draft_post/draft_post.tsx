// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {Screens} from '@app/constants';
import {useTheme} from '@app/context/theme';
import {getUserCustomStatus} from '@app/utils/user';

import Avatar from '../post_list/post/avatar/avatar';
import HeaderDisplayName from '../post_list/post/header/display_name';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channel: ChannelModel;
    draft: DraftModel;
    currentUser: UserModel;
}

const DraftPost: React.FC<Props> = ({
    channel,
    draft,
    currentUser,
}) => {
    const theme = useTheme();

    const post: Post = {
        id: draft.rootId || '',
        channel_id: channel.id,
        message: draft.message,
        create_at: 0,
        update_at: 0,
        delete_at: 0,
        user_id: currentUser.id,
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

    const customStatus = getUserCustomStatus(currentUser);

    return (
        <View style={{height: 60}}>
            {/* <Text>{channel.displayName}</Text>
            <Text>{channel.type}</Text>
            <Text>{draft.rootId ? 'In Thread' : 'Channel'}</Text>
    */}
            <HeaderDisplayName
                channelId={channel.id}
                commentCount={0}
                displayName={currentUser.username}
                location={Screens.GLOBAL_DRAFTS}
                theme={theme}
                userId={currentUser.id}
                showCustomStatusEmoji={false}
                customStatus={customStatus!}
            />
            <Avatar
                author={currentUser}
                enablePostIconOverride={false}
                isAutoReponse={false}
                location={Screens.GLOBAL_DRAFTS}
                post={post as unknown as PostModel}
            />
            <Text>{draft.message}</Text>
        </View>
    );
};

export default DraftPost;
