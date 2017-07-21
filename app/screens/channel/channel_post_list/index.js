// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost} from 'mattermost-redux/actions/posts';
import {RequestStatus} from 'mattermost-redux/constants';
import {makeGetPostsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentChannelId, getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';

import {loadPostsIfNecessary, loadThreadIfNecessary, increasePostVisibility} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import ChannelPostList from './channel_post_list';

function makeMapStateToProps() {
    const getPostsInChannel = makeGetPostsInChannel();

    return function mapStateToProps(state, ownProps) {
        const channelId = ownProps.channel.id;
        const {refreshing} = state.views.channel;
        const {getPosts} = state.requests.posts;
        const posts = getPostsInChannel(state, channelId) || [];

        return {
            channelIsLoading: getPosts.status === RequestStatus.STARTED || state.views.channel.loading,
            channelIsRefreshing: refreshing,
            currentChannelId: getCurrentChannelId(state),
            posts,
            postVisibility: state.views.channel.postVisibility[channelId],
            loadingPosts: state.views.channel.loadingPosts[channelId],
            myMember: getMyCurrentChannelMembership(state),
            networkOnline: state.offline.online,
            theme: getTheme(state),
            ...ownProps
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessary,
            loadThreadIfNecessary,
            increasePostVisibility,
            selectPost
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ChannelPostList);
