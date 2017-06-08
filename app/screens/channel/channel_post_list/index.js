// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost, getPostsBefore} from 'mattermost-redux/actions/posts';
import {makeGetPostsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';

import {loadPostsIfNecessary} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import ChannelPostList from './channel_post_list';

const getPostsInCurrentChannelWithReplyProps = makeGetPostsInChannel();

function mapStateToProps(state, ownProps) {
    const {loading, refreshing} = state.views.channel;
    const {currentChannelId} = state.entities.channels;

    return {
        ...ownProps,
        applicationInitializing: state.views.root.appInitializing,
        channelIsLoading: loading,
        channelIsRefreshing: refreshing,
        myMember: getMyCurrentChannelMembership(state),
        postsRequests: state.requests.posts,
        posts: getPostsInCurrentChannelWithReplyProps(state, currentChannelId) || [],
        theme: getTheme(state),
        networkOnline: state.offline.online
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessary,
            getPostsBefore,
            selectPost
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
