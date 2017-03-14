// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goToChannelMembers, goToChannelAddMembers, goBack} from 'app/actions/navigation';
import {getChannelStats, deleteChannel} from 'mattermost-redux/actions/channels';
import {markFavorite, unmarkFavorite, leaveChannel} from 'app/actions/views/channel';
import {getCurrentChannel, getCurrentChannelStats, getChannelsByCategory, canManageChannelMembers} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'app/selectors/preferences';
import {getUser} from 'mattermost-redux/selectors/entities/users';

import ChannelInfo from './channel_info';

function mapStateToProps(state, ownProps) {
    const currentChannel = getCurrentChannel(state);
    const currentChannelCreator = getUser(state, currentChannel.creator_id);
    const currentChannelCreatorName = currentChannelCreator && currentChannelCreator.username;
    const currentChannelMemberCount = getCurrentChannelStats(state) && getCurrentChannelStats(state).member_count;
    const favoriteChannels = getChannelsByCategory(state).favoriteChannels.map((f) => f.id);
    const isFavorite = favoriteChannels.indexOf(currentChannel.id) > -1;
    const leaveChannelRequest = state.requests.channels.leaveChannel;

    return {
        ...ownProps,
        currentTeamId: state.entities.teams.currentTeamId,
        currentChannel,
        currentChannelCreatorName,
        currentChannelMemberCount,
        isFavorite,
        leaveChannelRequest,
        theme: getTheme(state),
        canManageUsers: canManageChannelMembers(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getChannelStats,
            goToChannelMembers,
            goToChannelAddMembers,
            markFavorite,
            unmarkFavorite,
            leaveChannel,
            deleteChannel,
            goBack
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(ChannelInfo);
