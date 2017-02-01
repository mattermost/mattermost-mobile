// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {closeDrawers} from 'app/actions/navigation';
import {closeDMChannel, handleSelectChannel, leaveChannel, markFavorite, unmarkFavorite} from 'app/actions/views/channel';

import {viewChannel} from 'service/actions/channels';
import {getChannelsByCategory, getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentTeam} from 'service/selectors/entities/teams';

import ChannelDrawer from './channel_drawer.js';

function mapStateToProps(state) {
    return {
        currentTeam: getCurrentTeam(state),
        currentChannel: getCurrentChannel(state),
        channels: getChannelsByCategory(state),
        channelMembers: state.entities.channels.myMembers,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            viewChannel,
            closeDMChannel,
            closeDrawers,
            leaveChannel,
            markFavorite,
            unmarkFavorite,
            handleSelectChannel
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawer);
