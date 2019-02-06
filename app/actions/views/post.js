// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Posts} from 'mattermost-redux/constants';
import {PostTypes} from 'mattermost-redux/action_types';
import {doPostAction} from 'mattermost-redux/actions/posts';

import {ViewTypes} from 'app/constants';

import {generateId} from 'app/utils/file';

export function sendAddToChannelEphemeralPost(user, addedUsername, message, channelId, postRootId = '') {
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

export function setAutocompleteSelector(dataSource, onSelect, options) {
    return {
        type: ViewTypes.SELECTED_ACTION_MENU,
        data: {
            dataSource,
            onSelect,
            options,
        },
    };
}

export function selectAttachmentMenuAction(postId, actionId, text, value) {
    return (dispatch) => {
        dispatch({
            type: ViewTypes.SUBMIT_ATTACHMENT_MENU_ACTION,
            postId,
            data: {
                [actionId]: {
                    text,
                    value,
                },
            },
        });

        dispatch(doPostAction(postId, actionId, value));
    };
}
