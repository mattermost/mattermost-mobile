// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {getPing} from 'actions/general';
import SelectServerView from 'components/select_server_view';

class SelectServerContainer extends Component {
    static propTypes = {
        onProceed: React.PropTypes.func,
        ping: React.PropTypes.object.isRequired,
        device: React.PropTypes.object.isRequired,
        actions: React.PropTypes.object.isRequired
    }

    render() {
        return (
            <SelectServerView
                ping={this.props.ping}
                device={this.props.device}
                getPing={this.props.actions.getPing}
            />
        );
    }
}

function mapStateToProps(state) {
    return {
        ping: state.entities.general.ping,
        device: state.views.device
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({getPing}, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectServerContainer);
