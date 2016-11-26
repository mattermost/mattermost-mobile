// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {TouchableHighlight, Text} from 'react-native';
import {logout} from 'actions/users';
import {RequestStatus} from 'constants';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Actions as Routes} from 'react-native-router-flux';

const propTypes = {
    logout: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class Logout extends Component {
    static propTypes = propTypes;

    componentWillReceiveProps(nextProps) {
        if (this.props.logout.status === RequestStatus.STARTED &&
          nextProps.logout.status === RequestStatus.SUCCESS) {
            Routes.popTo('goToSelectServer');
        }
    }

    logout = () => this.props.actions.logout();

    render() {
        return (
            <TouchableHighlight onPress={this.logout}>
                <Text>{'logout'}</Text>
            </TouchableHighlight>
        );
    }
}

function mapStateToProps(state) {
    return {
        logout: state.requests.users.logout
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({logout}, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Logout);
