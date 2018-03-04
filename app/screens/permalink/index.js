// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getChannel as getChannelAction, joinChannel, markChannelAsRead, markChannelAsViewed} from 'mattermost-redux/actions/channels';
import {getPostsAfter, getPostsBefore, getPostThread, selectPost} from 'mattermost-redux/actions/posts';
import {getMyChannelMemberships, makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {makeGetPostIdsAroundPost, getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {
    handleSelectChannel,
    loadThreadIfNecessary,
    setChannelDisplayName,
    setChannelLoading,
} from 'app/actions/views/channel';
import {handleTeamChange} from 'app/actions/views/select_team';

import Permalink from './permalink';

function makeMapStateToProps() {
    const getPostIdsAroundPost = makeGetPostIdsAroundPost();
    const getChannel = makeGetChannel();

    return function mapStateToProps(state) {
        const {currentFocusedPostId} = state.entities.posts;
        const post = getPost(state, currentFocusedPostId);
        const channel = post ? getChannel(state, {id: post.channel_id}) : null;
        let postIds;

        if (channel && channel.id) {
            postIds = getPostIdsAroundPost(state, currentFocusedPostId, channel.id, {
                postsBeforeCount: 10,
                postsAfterCount: 10,
            });
        }

        return {
            channelId: channel ? channel.id : '',
            channelName: channel ? channel.display_name : '',
            channelTeamId: channel ? channel.team_id : '',
            currentTeamId: getCurrentTeamId(state),
            currentUserId: getCurrentUserId(state),
            focusedPostId: currentFocusedPostId,
            myMembers: getMyChannelMemberships(state),
            postIds,
            theme: getTheme(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getPostsAfter,
            getPostsBefore,
            getPostThread,
            getChannel: getChannelAction,
            handleSelectChannel,
            handleTeamChange,
            joinChannel,
            loadThreadIfNecessary,
            markChannelAsRead,
            markChannelAsViewed,
            selectPost,
            setChannelDisplayName,
            setChannelLoading,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps, null, {withRef: true})(Permalink);
