// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goBack} from 'app/actions/navigation';
import {login} from 'service/actions/users';

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

export default connect(mapStateToProps, mapDispatchToProps)(Mfa);
