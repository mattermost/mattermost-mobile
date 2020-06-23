// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {EmojiTypes} from '@mm-redux/action_types';
import {addReaction as serviceAddReaction, getNeededCustomEmojis} from '@mm-redux/actions/posts';
import {Client4} from '@mm-redux/client';
import {getPostIdsInCurrentChannel, makeGetPostIdsForThread} from '@mm-redux/selectors/entities/posts';

import {ViewTypes} from 'app/constants';

const getPostIdsForThread = makeGetPostIdsForThread();

export function addReaction(postId, emoji) {
    return (dispatch) => {
        dispatch(serviceAddReaction(postId, emoji));
        dispatch(addRecentEmoji(emoji));
    };
}

export function addReactionToLatestPost(emoji, rootId) {
    return async (dispatch, getState) => {
        const state = getState();
        const postIds = rootId ? getPostIdsForThread(state, rootId) : getPostIdsInCurrentChannel(state);
        const lastPostId = postIds[0];

        dispatch(serviceAddReaction(lastPostId, emoji));
        dispatch(addRecentEmoji(emoji));
    };
}

export function addRecentEmoji(emoji) {
    return {
        type: ViewTypes.ADD_RECENT_EMOJI,
        emoji,
    };
}

export function incrementEmojiPickerPage() {
    return async (dispatch) => {
        dispatch({
            type: ViewTypes.INCREMENT_EMOJI_PICKER_PAGE,
        });

        return {data: true};
    };
}

export function getEmojisInPosts(posts) {
    return async (dispatch, getState) => {
        const state = getState();

        // Do not wait for this as they need to be loaded one by one
        const emojisToLoad = getNeededCustomEmojis(state, posts);

        if (emojisToLoad?.size > 0) {
            const promises = Array.from(emojisToLoad).map((name) => getCustomEmojiByName(name));
            const result = await Promise.all(promises);
            const actions = [];
            const data = [];

            result.forEach((emoji, index) => {
                const name = emojisToLoad[index];

                if (emoji) {
                    switch (emoji) {
                    case 404:
                        actions.push({type: EmojiTypes.CUSTOM_EMOJI_DOES_NOT_EXIST, data: name});
                        break;
                    default:
                        data.push(emoji);
                    }
                }
            });

            if (data.length) {
                actions.push({type: EmojiTypes.RECEIVED_CUSTOM_EMOJIS, data});
            }

            if (actions.length) {
                dispatch(batchActions(actions, 'BATCH_GET_EMOJIS_FOR_POSTS'));
            }
        }
    };
}

async function getCustomEmojiByName(name) {
    try {
        const data = await Client4.getCustomEmojiByName(name);

        return data;
    } catch (error) {
        if (error.status_code === 404) {
            return 404;
        }
    }

    return null;
}