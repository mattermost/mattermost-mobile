// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {handleSelectChannel, setChannelDisplayName} from '@actions/views/channel';
import {getArchivedChannels, getChannels, getSharedChannels, joinChannel, searchChannels} from '@mm-redux/actions/channels';
import {General} from '@mm-redux/constants';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {showCreateOption} from '@mm-redux/utils/channel_utils';
import {teamArchivedChannels, joinablePublicChannels, joinableSharedChannels} from '@selectors/channel';

import MoreChannels from './more_channels';

const defaultSharedChannels = [];

function mapStateToProps(state) {
    const config = getConfig(state);
    const sharedChannelsEnabled = config.ExperimentalSharedChannels === 'true';
    const channels = joinablePublicChannels(state);
    const sharedChannels = sharedChannelsEnabled ? joinableSharedChannels(state) : defaultSharedChannels;
    const archivedChannels = teamArchivedChannels(state);
    const currentTeamId = getCurrentTeamId(state);
    const canShowArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';

    return {
        canCreateChannels: showCreateOption(state, currentTeamId, General.OPEN_CHANNEL),
        currentUserId: getCurrentUserId(state),
        currentTeamId,
        channels,
        sharedChannels,
        sharedChannelsEnabled,
        archivedChannels,
        theme: getTheme(state),
        canShowArchivedChannels,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getArchivedChannels,
            getChannels,
            getSharedChannels,
            handleSelectChannel,
            joinChannel,
            searchChannels,
            setChannelDisplayName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreChannels);
