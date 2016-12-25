// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    loadChannelsIfNecessary,
    loadProfilesAndTeamMembersForDMSidebar,
    selectInitialChannel
} from 'app/actions/views/channel';
import {openChannelSidebar} from 'app/actions/views/drawer';

import {getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentTeam} from 'service/selectors/entities/teams';

import Channel from './channel.js';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        currentTeam: getCurrentTeam(state),
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectInitialChannel,
            openChannelSidebar
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
