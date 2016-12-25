// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectChannel} from 'service/actions/channels';
import {getChannelsByCategory} from 'service/selectors/entities/channels';
import {closeChannelSidebar} from 'app/actions/views/drawer';
import ChannelSidebar from './channel_drawer';

function mapStateToProps(state, ownProps) {
    const isOpen = state.views.sidebar.channel;
    const preferences = state.entities.preferences.myPreferences;
    return {
        ...ownProps,
        preferences,
        channels: getChannelsByCategory(state),
        isOpen
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectChannel,
            closeChannelSidebar
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelSidebar);
