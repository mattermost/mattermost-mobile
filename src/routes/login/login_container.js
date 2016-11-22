// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getClientConfig} from 'actions/general.js';
import * as LoginActions from 'actions/views/login.js';

import Login from './login.js';

function mapStateToProps(state) {
    return {
        ...state.views.login,
        clientConfig: state.entities.general.clientConfig
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...LoginActions,
            getClientConfig
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
