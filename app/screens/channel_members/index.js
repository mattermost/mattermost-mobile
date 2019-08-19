// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentChannel, canManageChannelMembers} from 'mattermost-redux/selectors/entities/channels';
import {makeGetProfilesInChannel} from 'mattermost-redux/selectors/entities/users';
import {getProfilesInChannel, searchProfiles} from 'mattermost-redux/actions/users';

import {setButtons, popTopScreen} from 'app/actions/navigation';
import {handleRemoveChannelMembers} from 'app/actions/views/channel_members';
import {isLandscape} from 'app/selectors/device';
import ChannelMembers from './channel_members';

function makeMapStateToProps() {
    const getChannelMembers = makeGetProfilesInChannel();

    return (state) => {
        const currentChannel = getCurrentChannel(state);
        let currentChannelMembers = [];
        if (currentChannel.id) {
            currentChannelMembers = getChannelMembers(state, currentChannel.id, true);
        }

        const canManageUsers = canManageChannelMembers(state) && !currentChannel.group_constrained;

        return {
            canManageUsers,
            currentChannelId: currentChannel.id,
            currentChannelMembers,
            currentUserId: state.entities.users.currentUserId,
            theme: getTheme(state),
            isLandscape: isLandscape(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesInChannel,
            handleRemoveChannelMembers,
            searchProfiles,
            setButtons,
            popTopScreen,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ChannelMembers);
