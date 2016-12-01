// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {TouchableHighlight, Text} from 'react-native';
import {logout} from 'actions/users';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

const propTypes = {
    logout: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class Logout extends Component {
    static propTypes = propTypes;

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
