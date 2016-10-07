// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {connect} from 'react-redux';
import {loadDevice} from 'actions/device.js';

import Loading from 'components/loading.js';
import RootNavigator from 'components/root_navigator.js';

class RootContainer extends React.Component {
    static propTypes = {
        device: React.PropTypes.object.isRequired,
        loadDevice: React.PropTypes.func.isRequired
    }

    constructor(props) {
        super(props);

        this.props.loadDevice();
    }

    render() {
        const device = this.props.device;

        if (device.loading) {
            return (
                <Loading/>
            );
        }

        return (
            <RootNavigator {...this.props}/>
        );
    }
}

function mapStateToProps(state) {
    return {
        device: state.views.device
    };
}

export default connect(mapStateToProps, {
    loadDevice
})(RootContainer);