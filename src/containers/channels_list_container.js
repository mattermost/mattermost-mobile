// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as channelActions from 'actions/channels';
import ChannelsListView from 'components/channels_list_view';

function mapStateToProps(state) {
    return {
        team: state.entities.team,
        channel: state.entities.channel
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(channelActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelsListView);
