// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {handleSelectChannel} from '@actions/views/channel';
import {closePermalink} from '@actions/views/permalink';
import {getPostsAround, getPostThread} from '@actions/views/post';
import {handleTeamChange} from '@actions/views/select_team';
import {getChannel as getChannelAction, joinChannel} from '@mm-redux/actions/channels';
import {selectPost} from '@mm-redux/actions/posts';
import {addUserToTeam, getTeamByName, removeUserFromTeam} from '@mm-redux/actions/teams';
import {makeGetChannel, getMyChannelMemberships} from '@mm-redux/selectors/entities/channels';
import {makeGetPostIdsAroundPost, getPost, makeGetPostIdsForThreadWithLimit} from '@mm-redux/selectors/entities/posts';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId, getTeamByName as selectTeamByName, getTeamMemberships} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';

import Permalink from './permalink';

function makeMapStateToProps() {
    const getPostIdsForThread = makeGetPostIdsForThreadWithLimit();
    const getPostIdsAroundPost = makeGetPostIdsAroundPost();
    const getChannel = makeGetChannel();

    return function mapStateToProps(state, props) {
        const {focusedPostId} = props;
        const post = getPost(state, focusedPostId);

        let channel;
        let postIds;

        if (post) {
            channel = getChannel(state, {id: post.channel_id});

            const options = {
                postsBeforeCount: 10,
                postsAfterCount: 10,
            };

            // It is passed only when CRT is enabled and post has a root_id
            if (props.isThreadPost) {
                postIds = getPostIdsForThread(state, post.root_id, focusedPostId, options.postsBeforeCount, options.postsAfterCount);
            } else {
                postIds = getPostIdsAroundPost(state, focusedPostId, post.channel_id, options);
            }
        }

        return {
            channelId: channel ? channel.id : '',
            channelIsArchived: channel ? channel.delete_at !== 0 : false,
            channelName: channel ? channel.display_name : '',
            channelTeamId: channel ? channel.team_id : '',
            currentTeamId: getCurrentTeamId(state),
            currentUserId: getCurrentUserId(state),
            focusedPostId,
            myChannelMemberships: getMyChannelMemberships(state),
            myTeamMemberships: getTeamMemberships(state),
            post,
            postIds,
            team: selectTeamByName(state, props.teamName),
            theme: getTheme(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addUserToTeam,
            closePermalink,
            getPostsAround,
            getPostThread,
            getChannel: getChannelAction,
            getTeamByName,
            handleSelectChannel,
            handleTeamChange,
            joinChannel,
            removeUserFromTeam,
            selectPost,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps, null, {forwardRef: true})(Permalink);
