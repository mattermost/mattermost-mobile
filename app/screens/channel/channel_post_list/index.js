// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {selectPost} from 'mattermost-redux/actions/posts';
import {RequestStatus} from 'mattermost-redux/constants';
import {makeGetPostsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {getMyCurrentChannelMembership, makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {Posts} from 'mattermost-redux/constants/';

import {loadPostsIfNecessaryWithRetry, loadThreadIfNecessary, increasePostVisibility, refreshChannelWithRetry} from 'app/actions/views/channel';
import {getConnection} from 'app/selectors/device';
import {getTheme} from 'app/selectors/preferences';
import LocalConfig from 'assets/config';

import ChannelPostList from './channel_post_list';

const getPostsInCurrentChannelWithReplyProps = makeGetPostsInChannel();

let townSquareId;

// create a selector for filtering out leave/join posts for only the town hall channel
const townSquarePostSelector = createSelector(
    (state, currentChannelId) => {
        if (!townSquareId) {
            const {channels} = state.entities.channels;
            townSquareId = Object.keys(channels).find((c) => channels[c].name === 'town-square');
        }

        return townSquareId === currentChannelId;
    },
    (state, currentChannelId) => getPostsInCurrentChannelWithReplyProps(state, currentChannelId) || [],
    (isTownHallChannel, posts) => {
        if (isTownHallChannel) {
            const PostTypes = Posts.POST_TYPES;
            return posts.filter((p) => p.type !== PostTypes.JOIN_LEAVE && p.type !== PostTypes.JOIN_CHANNEL && p.type !== PostTypes.LEAVE_CHANNEL);
        }

        return posts;
    }
);

function makeMapStateToProps() {
    const getChannel = makeGetChannel();
    const getPostsInChannel = LocalConfig.DisableTownSquareLeaveJoinMessage ? townSquarePostSelector : makeGetPostsInChannel();

    return function mapStateToProps(state, ownProps) {
        const channelId = ownProps.channelId;
        const {getPosts, getPostsRetryAttempts, getPostsSince, getPostsSinceRetryAttempts} = state.requests.posts;
        const posts = getPostsInChannel(state, channelId) || [];
        const {websocket: websocketRequest} = state.requests.general;
        const networkOnline = getConnection(state);
        const webSocketOnline = websocketRequest.status === RequestStatus.SUCCESS;

        let getPostsStatus;
        if (getPostsRetryAttempts > 0) {
            getPostsStatus = getPosts.status;
        } else if (getPostsSinceRetryAttempts > 1) {
            getPostsStatus = getPostsSince.status;
        }

        let channelIsRefreshing = state.views.channel.refreshing;
        let channelRefreshingFailed = getPostsStatus === RequestStatus.FAILURE && webSocketOnline;
        if (!networkOnline) {
            channelIsRefreshing = false;
            channelRefreshingFailed = false;
        }

        return {
            channel: getChannel(state, {id: channelId}),
            channelIsLoading: state.views.channel.loading,
            channelIsRefreshing,
            channelRefreshingFailed,
            posts,
            postVisibility: state.views.channel.postVisibility[channelId],
            loadingPosts: state.views.channel.loadingPosts[channelId],
            myMember: getMyCurrentChannelMembership(state),
            networkOnline,
            theme: getTheme(state),
            ...ownProps
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

export default connect(makeMapStateToProps, mapDispatchToProps)(ChannelPostList);
