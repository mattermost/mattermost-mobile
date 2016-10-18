// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as loginActions from 'actions/login';
import LoginView from 'components/login_view';

const propTypes = {
    login: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
};

class LoginContainer extends Component {
    static propTypes = propTypes;
    render() {
        return (
            <LoginView
                login={this.props.login}
                actions={this.props.actions}
            />
        );
    }
}

function mapStateToProps(state) {
    return {
        login: state.views.login
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(loginActions, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(LoginContainer);
