// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {connect} from 'react-redux';
import {loadDevice} from 'actions/device';
import Loading from 'components/loading';
import Routes from 'routes';

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
            <Routes/>
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
