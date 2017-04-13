// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goBack} from 'app/actions/navigation';
import {login} from 'mattermost-redux/actions/users';

import Mfa from './mfa';

function mapStateToProps(state) {
    const {login: loginRequest} = state.requests.users;
    const {loginId, password} = state.views.login;
    return {
        loginId,
        password,
        loginRequest
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBack,
            login
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(Mfa);
