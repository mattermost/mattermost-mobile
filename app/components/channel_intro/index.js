// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {General} from 'mattermost-redux/constants';
import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUser, getProfilesInCurrentChannel} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'app/selectors/preferences';

import ChannelIntro from './channel_intro';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state) || {};
    const currentUser = getCurrentUser(state) || {};

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

    return {
        creator,
        currentChannel,
        currentChannelMembers,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    // placeholder for invite and set header actions
    return {
        actions: bindActionCreators({}, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelIntro);
