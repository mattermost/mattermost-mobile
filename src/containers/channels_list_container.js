// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as channelActions from 'actions/channels';
import ChannelsListView from 'components/channels_list_view';

const propTypes = {
    channels: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class ChannelsListContainer extends Component {
    static propTypes = propTypes;
    render() {
        return (
            <ChannelsListView
                channels={this.props.channels}
                actions={this.props.actions}
            />
        );
    }
}

function mapStateToProps(state) {
    return {
        channels: state.entities.channels
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(channelActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelsListContainer);
