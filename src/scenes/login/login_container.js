// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getClientConfig, getLicenseConfig} from 'actions/general';
import * as LoginActions from 'actions/views/login';
import {goToSelectTeam} from 'actions/navigation';
import {login} from 'actions/users';

import Login from './login.js';

function mapStateToProps(state) {
    return {
        ...state.views.login,
        loginRequest: state.requests.users.login,
        configRequest: state.requests.general.config,
        licenseRequest: state.requests.general.license,
        config: state.entities.general.config,
        license: state.entities.general.license
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...LoginActions,
            login,
            getClientConfig,
            getLicenseConfig,
            goToSelectTeam
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
