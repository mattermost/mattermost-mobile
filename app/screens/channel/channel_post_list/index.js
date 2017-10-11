// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost} from 'mattermost-redux/actions/posts';
import {RequestStatus} from 'mattermost-redux/constants';
import {makeGetPostsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentChannelId, getMyCurrentChannelMembership, makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {loadPostsIfNecessaryWithRetry, loadThreadIfNecessary, increasePostVisibility, refreshChannelWithRetry} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import ChannelPostList from './channel_post_list';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();
    const getPostsInChannel = makeGetPostsInChannel();

    return function mapStateToProps(state) {
        const channelId = getCurrentChannelId(state);
        const posts = getPostsInChannel(state, channelId) || [];
        const channelRefreshingFailed = state.views.channel.retryFailed;
        const channel = getChannel(state, {id: channelId}) || {};

        return {
            channelId,
            channelRefreshingFailed,
            currentUserId: getCurrentUserId(state),
            channelType: channel.type,
            channelDisplayName: channel.display_name,
            posts,
            postVisibility: state.views.channel.postVisibility[channelId],
            lastViewedAt: getMyCurrentChannelMembership(state).last_viewed_at,
            totalMessageCount: channel.total_msg_count,
            theme: getTheme(state)
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessaryWithRetry,
            loadThreadIfNecessary,
            increasePostVisibility,
            selectPost,
            refreshChannelWithRetry
        }, dispatch)
    };
}

function areStatesEqual(next, prev) {
    const nextChannelId = next.entities.channels.currentChannelId;
    const prevChannelId = prev.entities.channels.currentChannelId;
    if (prevChannelId !== nextChannelId) {
        return false;
    }
    const nextVisible = next.views.channel.postVisibility[nextChannelId];
    const prevVisible = prev.views.channel.postVisibility[nextChannelId];
    const nextPostsIds = next.entities.posts.postsInChannel[nextChannelId];
    const prevPostsIds = prev.entities.posts.postsInChannel[nextChannelId];

    // When we don't have posts and we failed to get the post after tha max retry attempts
    const prevRetryFailed = prev.views.channel.retryFailed;
    const nextRetryFailed = next.views.channel.retryFailed;
    if (prevRetryFailed !== nextRetryFailed && nextRetryFailed && !nextPostsIds) {
        return false;
    }

    // if we don't have post and visibility is not set we don't need to re-render
    if (!nextPostsIds || !nextVisible || !prevVisible) {
        return true;
    }

    const nextVisiblePostsIds = nextPostsIds.slice(0, nextVisible);
    const prevVisiblePostsIds = prevPostsIds ? prevPostsIds.slice(0, prevVisible) : [];

    // if we have a different amount of post we should re-render
    if (nextVisiblePostsIds.length !== prevVisiblePostsIds.length) {
        return false;
    }

    const {status: nextStatus} = next.requests.posts.getPosts;
    const {status: prevStatus} = prev.requests.posts.getPosts;

    // if we are requesting post for the first time we should re-render
    if (prevStatus === RequestStatus.STARTED && nextStatus === RequestStatus.SUCCESS &&
        nextPostsIds.length !== prevPostsIds.length) {
        return false;
    }

    // if at least one post id changed we need to re-render
    for (let i = 0; i <= nextVisiblePostsIds.length; i++) {
        if (nextVisiblePostsIds[i] && nextVisiblePostsIds[i] !== prevVisiblePostsIds[i]) {
            return false;
        }
    }

    return true;
}

export default connect(makeMapStateToProps, mapDispatchToProps, null, {pure: true, areStatesEqual})(ChannelPostList);
