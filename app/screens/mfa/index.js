// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {login} from 'mattermost-redux/actions/users';

import Mfa from './mfa';

function mapStateToProps(state) {
    const {login: loginRequest} = state.requests.users;
    const {loginId, password} = state.views.login;
    return {
        loginId,
        password,
        loginRequest,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            login,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Mfa);
