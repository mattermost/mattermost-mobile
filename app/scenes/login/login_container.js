// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import LoginActions from 'app/actions/views/login';
import {goToMfa, goToLoadTeam} from 'app/actions/navigation';
import {checkMfa, login} from 'service/actions/users';

import Login from './login.js';

function mapStateToProps(state) {
    const {checkMfa: checkMfaRequest, login: loginRequest} = state.requests.users;
    const {config, license} = state.entities.general;
    return {
        ...state.views.login,
        checkMfaRequest,
        loginRequest,
        config,
        license
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...LoginActions,
            checkMfa,
            login,
            goToMfa,
            goToLoadTeam
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(Login);
