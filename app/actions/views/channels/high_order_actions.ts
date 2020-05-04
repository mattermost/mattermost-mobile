// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ViewTypes} from '@constants';
import {ActionFunc, DispatchFunc, GetStateFunc, SuccessResult, batchActions} from '@mm-redux/types/actions';

import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {
    getDraftForChannel,
    getLoadingPostsForChannel,
} from '@selectors/views';

import {
    postDraftChangedForChannel,
    channelPostsLoading,
    setChannelRefreshing,
    setChannelRetryFailed,
    setLoadMorePostsVisible,
} from '@actions/views/channels';
import {getPosts, getPostsBefore} from '@actions/views/post';
import {dispatchWithRetry} from '@actions/helpers/general';

import {isPendingPost} from '@utils/general';

export function handlePostDraftChanged(channelId: string, draft: string): ActionFunc {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const prevDraft = getDraftForChannel(state, channelId);

        if (prevDraft.draft !== draft) {
            dispatch(postDraftChangedForChannel(channelId, draft));
        }

        return {data: true};
    };
}

export function increasePostVisibility(channelId: string, postId: string): ActionFunc {
    // Returns true if there are more posts to load
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const loadingPosts = getLoadingPostsForChannel(state, channelId);
        const currentUserId = getCurrentUserId(state);

        if (loadingPosts) {
            return {data: true};
        }

        if (!postId) {
            // No posts are visible, so the channel is empty
            return {data: true};
        }

        if (isPendingPost(postId, currentUserId)) {
            // This is the first created post in the channel
            return {data: true};
        }

        dispatch(channelPostsLoading(channelId, true));

        const pageSize = ViewTypes.POST_VISIBILITY_CHUNK_SIZE;

        const postAction = getPostsBefore(channelId, postId, 0, pageSize);
        const {data} = await dispatch(dispatchWithRetry(postAction));

        const actions = [channelPostsLoading(channelId, false)];

        let hasMorePost = false;
        if (data) {
            actions.push(setChannelRetryFailed(false));

            if (data.order) {
                const count = data.order.length;
                hasMorePost = count >= pageSize;

                actions.push(setLoadMorePostsVisible(hasMorePost));
            }
        }

        dispatch(batchActions(actions, 'BATCH_LOAD_MORE_POSTS'));

        return {data: hasMorePost};
    };
}

export function refreshChannelWithRetry(channelId: string): ActionFunc {
    return async (dispatch) => {
        dispatch(setChannelRefreshing(true));

        const result = await dispatch(dispatchWithRetry(getPosts(channelId)));
        const actions = [setChannelRefreshing(false)];

        const {data} = <SuccessResult>result;
        if (data) {
            actions.push(setChannelRetryFailed(false));
        }

        dispatch(batchActions(actions, 'BATCH_REFRESH_CHANNEL'));

        return data;
    };
}
