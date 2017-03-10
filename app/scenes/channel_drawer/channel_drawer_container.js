// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {closeDrawers} from 'app/actions/navigation';
import {handleSelectChannel} from 'app/actions/views/channel';

import {getChannelsByCategory, getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentTeam} from 'service/selectors/entities/teams';

import {viewChannel, markChannelAsRead} from 'service/actions/channels';

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
            closeDrawers,
            handleSelectChannel,
            viewChannel,
            markChannelAsRead
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawer);
