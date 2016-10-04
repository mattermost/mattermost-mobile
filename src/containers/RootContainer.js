// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import RootNavigator from '../components/RootNavigator';
import Loading from '../components/Loading';

import {loadDevice} from '../actions/device';

class RootContainer extends Component {
    constructor(props) {
        super(props);
        this.props.loadDevice();
    }

    render() {
        const {device} = this.props;

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

RootContainer.propTypes = {
    device: PropTypes.object.isRequired,
    loadDevice: PropTypes.func.isRequired
};

function mapStateToProps(state) {
    return {
        device: state.views.device
    };
}

export default connect(mapStateToProps, {
    loadDevice
})(RootContainer);