// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {closeDrawers, goBack, goToCreateChannel} from 'app/actions/navigation';
import {getTheme} from 'app/selectors/preferences';
import {getMoreChannels as getMoreChannelsSelector} from 'mattermost-redux/selectors/entities/channels';
import {handleSelectChannel} from 'app/actions/views/channel';
import {getMoreChannels, joinChannel, searchMoreChannels} from 'mattermost-redux/actions/channels';

import MoreChannels from './more_channels';

function mapStateToProps(state) {
    const {currentUserId} = state.entities.users;
    const {currentTeamId} = state.entities.teams;
    const {getMoreChannels: requestStatus} = state.requests.channels;
    const channels = getMoreChannelsSelector(state);

    return {
        currentUserId,
        currentTeamId,
        channels,
        theme: getTheme(state),
        requestStatus
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeDrawers,
            goBack,
            handleSelectChannel,
            goToCreateChannel,
            joinChannel,
            getMoreChannels,
            searchMoreChannels
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(MoreChannels);
