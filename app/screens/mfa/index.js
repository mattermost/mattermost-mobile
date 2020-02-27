// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {login} from 'app/actions/views/user';

import Mfa from './mfa';

function mapStateToProps(state) {
    const {loginId, password} = state.views.login;
    return {
        loginId,
        password,
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
