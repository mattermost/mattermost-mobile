// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import LoginActions from 'app/actions/views/login';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {showCustomTerms} from 'mattermost-redux/selectors/entities/users';

import {checkMfa, login} from 'mattermost-redux/actions/users';

import Login from './login.js';

function mapStateToProps(state) {
    const {checkMfa: checkMfaRequest, login: loginRequest} = state.requests.users;
    const config = getConfig(state);
    const license = getLicense(state);
    const showTermsOfService = showCustomTerms(state);

    return {
        ...state.views.login,
        checkMfaRequest,
        loginRequest,
        config,
        license,
        showTermsOfService,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...LoginActions,
            checkMfa,
            login,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
