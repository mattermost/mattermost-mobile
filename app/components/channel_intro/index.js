// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {getCurrentChannel, getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getUser, makeGetProfilesInChannel} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelIntro from './channel_intro';

const getProfilesInCurrentChannel = makeGetProfilesInChannel();

const getCurrentChannelMembers = createSelector(
    getCurrentChannelId,
    getCurrentUserId,
    (state) => getProfilesInCurrentChannel(state, getCurrentChannelId(state)),
    (currentChannelId, currentUserId, profilesInChannel) => {
        if (!currentChannelId) {
            return [];
        }

        const currentChannelMembers = profilesInChannel || [];
        return currentChannelMembers.filter((m) => m.id !== currentUserId);
    }
);

const getOtherUserIdForDm = createSelector(
    getCurrentChannel,
    getCurrentUserId,
    (currentChannel, currentUserId) => {
        if (!currentChannel) {
            return '';
        }

        return currentChannel.name.split('__').find((m) => m !== currentUserId);
    }
);

const getCurrentChannelMembersForDm = createSelector(
    (state) => getUser(state, getOtherUserIdForDm(state)),
    (otherUser) => {
        if (!otherUser) {
            return [];
        }

        return [otherUser];
    }
);

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const {status: getPostsRequestStatus} = state.requests.posts.getPosts;

    let currentChannelMembers;
    let creator;
    let postsInChannel;

    if (currentChannel) {
        if (currentChannel.type === General.DM_CHANNEL) {
            currentChannelMembers = getCurrentChannelMembersForDm(state);
        } else {
            currentChannelMembers = getCurrentChannelMembers(state);
        }

        creator = getUser(state, currentChannel.creator_id);
        postsInChannel = state.entities.posts.postsInChannel[currentChannel.Id];
    }

    return {
        creator,
        currentChannel,
        currentChannelMembers,
        isLoadingPosts: (!postsInChannel || postsInChannel.length === 0) && getPostsRequestStatus === RequestStatus.STARTED,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelIntro);
