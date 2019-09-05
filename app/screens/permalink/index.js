// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getChannel as getChannelAction, joinChannel} from 'mattermost-redux/actions/channels';
import {
    getPostsAround,
    getPostThread,
    selectPost,
} from 'mattermost-redux/actions/posts';
import {makeGetChannel, getMyChannelMemberships} from 'mattermost-redux/selectors/entities/channels';
import {makeGetPostIdsAroundPost, getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {isLandscape} from 'app/selectors/device';

import {
    goToScreen,
    dismissModal,
    dismissAllModals,
    resetToChannel,
} from 'app/actions/navigation';
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

        let channel;
        let postIds;

        if (post) {
            channel = getChannel(state, {id: post.channel_id});
            postIds = getPostIdsAroundPost(state, currentFocusedPostId, post.channel_id, {
                postsBeforeCount: 10,
                postsAfterCount: 10,
            });
        }

        return {
            channelId: channel ? channel.id : '',
            channelIsArchived: channel ? channel.delete_at !== 0 : false,
            channelName: channel ? channel.display_name : '',
            channelTeamId: channel ? channel.team_id : '',
            currentTeamId: getCurrentTeamId(state),
            currentUserId: getCurrentUserId(state),
            focusedPostId: currentFocusedPostId,
            myMembers: getMyChannelMemberships(state),
            postIds,
            theme: getTheme(state),
            isLandscape: isLandscape(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getPostsAround,
            getPostThread,
            getChannel: getChannelAction,
            handleSelectChannel,
            handleTeamChange,
            joinChannel,
            loadThreadIfNecessary,
            selectPost,
            setChannelDisplayName,
            setChannelLoading,
            goToScreen,
            dismissModal,
            dismissAllModals,
            resetToChannel,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Permalink);
