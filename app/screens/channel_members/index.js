// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleRemoveChannelMembers} from 'app/actions/views/channel_members';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentChannel, canManageChannelMembers} from 'mattermost-redux/selectors/entities/channels';
import {getProfilesInCurrentChannel} from 'mattermost-redux/selectors/entities/users';
import {getProfilesInChannel, searchProfiles} from 'mattermost-redux/actions/users';

import ChannelMembers from './channel_members';

function mapStateToProps(state) {
    const currentChannelMembers = getProfilesInCurrentChannel(state).filter((member) => member.delete_at === 0);
    return {
        theme: getTheme(state),
        currentChannel: getCurrentChannel(state) || {},
        currentChannelMembers,
        currentUserId: state.entities.users.currentUserId,
        requestStatus: state.requests.users.getProfilesInChannel.status,
        searchRequestStatus: state.requests.users.searchProfiles.status,
        removeMembersStatus: state.requests.channels.removeChannelMember.status,
        canManageUsers: canManageChannelMembers(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesInChannel,
            handleRemoveChannelMembers,
            searchProfiles,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelMembers);
