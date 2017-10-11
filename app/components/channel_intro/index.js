// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {General, RequestStatus} from 'mattermost-redux/constants';
import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUser, getProfilesInCurrentChannel} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'app/selectors/preferences';

import ChannelIntro from './channel_intro';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state) || {};
    const currentUser = getCurrentUser(state) || {};
    const {status: getPostsRequestStatus} = state.requests.posts.getPosts;

    let currentChannelMembers = [];
    if (currentChannel.type === General.DM_CHANNEL) {
        const otherChannelMember = currentChannel.name.split('__').find((m) => m !== currentUser.id);
        const otherProfile = state.entities.users.profiles[otherChannelMember];
        if (otherProfile) {
            currentChannelMembers.push(otherProfile);
        }
    } else {
        currentChannelMembers = getProfilesInCurrentChannel(state) || [];
        currentChannelMembers = currentChannelMembers.filter((m) => m.id !== currentUser.id);
    }

    const creator = currentChannel.creator_id === currentUser.id ? currentUser : state.entities.users.profiles[currentChannel.creator_id];
    const postsInChannel = state.entities.posts.postsInChannel[currentChannel.id] || [];

    return {
        creator,
        currentChannel,
        currentChannelMembers,
        isLoadingPosts: !postsInChannel.length && getPostsRequestStatus === RequestStatus.STARTED,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelIntro);
