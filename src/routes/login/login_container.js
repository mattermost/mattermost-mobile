// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import * as loginActions from 'actions/login.js';
import {getClientConfig} from 'actions/general.js';
import LoginViewActions from 'actions/views/login.js';

import Login from './login.js';

function mapStateToProps(state) {
    return {
        ...state.views.Login,
        clientConfig: state.entities.general.clientConfig,
        login: state.views.login
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...LoginViewActions,
            ...loginActions,
            getClientConfig
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
