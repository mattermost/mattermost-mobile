// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTeamStats} from 'mattermost-redux/actions/teams';
import {getProfilesNotInChannel, searchProfiles} from 'mattermost-redux/actions/users';
import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId, getProfilesNotInCurrentChannel} from 'mattermost-redux/selectors/entities/users';

import {setButtons, popTopScreen} from 'app/actions/navigation';
import {handleAddChannelMembers} from 'app/actions/views/channel_add_members';
import {isLandscape} from 'app/selectors/device';
import ChannelAddMembers from './channel_add_members';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);

    return {
        currentChannelId: currentChannel.id,
        currentChannelGroupConstrained: currentChannel.group_constrained,
        currentTeamId: getCurrentTeamId(state),
        currentUserId: getCurrentUserId(state),
        profilesNotInChannel: getProfilesNotInCurrentChannel(state),
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeamStats,
            getProfilesNotInChannel,
            handleAddChannelMembers,
            searchProfiles,
            setButtons,
            popTopScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelAddMembers);
