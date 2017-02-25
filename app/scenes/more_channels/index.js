// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goBack, goToCreateChannel} from 'app/actions/navigation';
import {getTheme} from 'service/selectors/entities/preferences';
import {getMoreChannels as getMoreChannelsSelector} from 'service/selectors/entities/channels';
import {handleSelectChannel} from 'app/actions/views/channel';
import {getMoreChannels, joinChannel, searchMoreChannels} from 'service/actions/channels';

import MoreChannels from './more_channels';

function mapStateToProps(state) {
    const {currentId: currentUserId} = state.entities.users;
    const {currentId: currentTeamId} = state.entities.teams;
    const {getMoreChannels: requestStatus} = state.requests.channels;

    return {
        currentUserId,
        currentTeamId,
        channels: getMoreChannelsSelector(state),
        theme: getTheme(state),
        requestStatus
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
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
