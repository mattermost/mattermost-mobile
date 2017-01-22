// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectChannel, viewChannel, leaveChannel} from 'service/actions/channels';
import {closeDMChannel, markFavorite, unmarkFavorite} from 'app/actions/views/channel';
import {getChannelsByCategory} from 'service/selectors/entities/channels';
import {closeChannelDrawer, shouldDisableChannelDrawer} from 'app/actions/views/drawer';
import ChannelDrawer from './channel_drawer';

function mapStateToProps(state, ownProps) {
    const channelMembers = state.entities.channels.myMembers;

    return {
        ...ownProps,
        ...state.views.drawer,
        channels: getChannelsByCategory(state),
        channelMembers
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectChannel,
            viewChannel,
            closeDMChannel,
            closeChannelDrawer,
            shouldDisableChannelDrawer,
            markFavorite,
            unmarkFavorite,
            leaveChannel
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawer);
