// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getChannels, joinChannel, searchChannels} from 'mattermost-redux/actions/channels';
import {getOtherChannels} from 'mattermost-redux/selectors/entities/channels';

import {handleSelectChannel} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import MoreChannels from './more_channels';

function mapStateToProps(state, ownProps) {
    const {currentUserId} = state.entities.users;
    const {currentTeamId} = state.entities.teams;
    const {getChannels: requestStatus} = state.requests.channels;
    const channels = getOtherChannels(state);

    return {
        ...ownProps,
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
            handleSelectChannel,
            joinChannel,
            getChannels,
            searchChannels
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreChannels);
