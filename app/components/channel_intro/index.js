// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {General} from 'mattermost-redux/constants';
import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getUser, makeGetProfilesInChannel} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isLandscape} from 'app/selectors/device';
import {goToScreen} from 'app/actions/navigation';
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

        let currentChannelMembers;
        let creator;

        if (currentChannel) {
            if (currentChannel.type === General.DM_CHANNEL) {
                currentChannelMembers = getChannelMembersForDm(state, currentChannel);
            } else {
                currentChannelMembers = getChannelMembers(state, currentChannel);
            }

            creator = getUser(state, currentChannel.creator_id);
        }

        return {
            creator,
            currentChannel,
            currentChannelMembers,
            theme: getTheme(state),
            isLandscape: isLandscape(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToScreen,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ChannelIntro);
