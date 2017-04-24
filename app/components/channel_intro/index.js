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
    const currentChannel = getCurrentChannel(state);
    const currentUser = getCurrentUser(state);

    let currentChannelMembers = [];
    if (currentChannel.type === General.DM_CHANNEL) {
        const otherChannelMember = currentChannel.name.split('__').find((m) => m !== currentUser.id);
        currentChannelMembers.push(state.entities.users.profiles[otherChannelMember]);
    }

    if (currentChannel.type === General.GM_CHANNEL) {
        currentChannelMembers = getProfilesInCurrentChannel(state);
    }

    return {
        currentChannel,
        currentChannelMembers,
        currentUser,
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
