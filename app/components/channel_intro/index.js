// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {General, RequestStatus} from 'mattermost-redux/constants';
import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getUser, makeGetProfilesInChannel} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {getChannelMembersForDm} from 'app/selectors/channel';

import ChannelIntro from './channel_intro';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();
    const getProfilesInChannel = makeGetProfilesInChannel();

    const getChannelMembers = createSelector(
        getCurrentUserId,
        (state, channel) => getProfilesInChannel(state, channel.id),
        (currentUserId, profilesInChannel) => {
            const currentChannelMembers = profilesInChannel || [];
            return currentChannelMembers.filter((m) => m.id !== currentUserId);
        }
    );

    return function mapStateToProps(state, ownProps) {
        const currentChannel = getChannel(state, {id: ownProps.channelId}) || {};
        const {status: getPostsRequestStatus} = state.requests.posts.getPosts;

        let currentChannelMembers;
        let creator;
        let postsInChannel;

        if (currentChannel) {
            if (currentChannel.type === General.DM_CHANNEL) {
                currentChannelMembers = getChannelMembersForDm(state, currentChannel);
            } else {
                currentChannelMembers = getChannelMembers(state, currentChannel);
            }

            creator = getUser(state, currentChannel.creator_id);
            postsInChannel = state.entities.posts.postsInChannel[currentChannel.Id];
        }

        return {
            creator,
            currentChannel,
            currentChannelMembers,
            isLoadingPosts: (!postsInChannel || postsInChannel.length === 0) && getPostsRequestStatus === RequestStatus.STARTED,
            theme: getTheme(state),
        };
    };
}

export default connect(makeMapStateToProps)(ChannelIntro);
