// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {Posts} from 'mattermost-redux/constants';
import {PostTypes} from 'mattermost-redux/action_types';

import {addChannelMember} from 'mattermost-redux/actions/channels';
import {removePost} from 'mattermost-redux/actions/posts';

import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {generateId} from 'app/utils/file';

import PostAddChannelMember from './post_add_channel_member';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId) || {};
    let channelType = '';
    if (post && post.channel_id) {
        const channel = getChannel(state, post.channel_id);
        if (channel && channel.type) {
            channelType = channel.type;
        }
    }

    return {
        channelType,
        currentUser: getCurrentUser(state),
        post,
    };
}

function sendEphemeralPost(user, addedUsername, message, channelId, postRootId) {
    return async (dispatch) => {
        const timestamp = Date.now();
        const post = {
            id: generateId(),
            user_id: user.id,
            channel_id: channelId,
            message,
            type: Posts.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL,
            create_at: timestamp,
            update_at: timestamp,
            root_id: postRootId,
            parent_id: postRootId,
            props: {
                username: user.username,
                addedUsername,
            },
        };

        dispatch({
            type: PostTypes.RECEIVED_POSTS,
            data: {
                order: [],
                posts: {
                    [post.id]: post,
                },
            },
            channelId,
        });
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addChannelMember,
            removePost,
            sendEphemeralPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostAddChannelMember);
