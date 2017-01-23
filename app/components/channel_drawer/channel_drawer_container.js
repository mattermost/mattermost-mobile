// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {viewChannel} from 'service/actions/channels';
import {getChannelsByCategory} from 'service/selectors/entities/channels';
import {closeDMChannel, handleSelectChannel} from 'app/actions/views/channel';
import {closeChannelDrawer} from 'app/actions/views/drawer';
import {updateStorage} from 'app/actions/storage';
import ChannelDrawer from './channel_drawer';

function mapStateToProps(state, ownProps) {
    const isOpen = state.views.drawer.channel;
    const channelMembers = state.entities.channels.myMembers;
    return {
        ...ownProps,
        channels: getChannelsByCategory(state),
        channelMembers,
        isOpen
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            updateStorage,
            handleSelectChannel,
            viewChannel,
            closeDMChannel,
            closeChannelDrawer
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawer);
