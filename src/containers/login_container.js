// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as loginActions from 'actions/login';
import {getClientConfig} from 'actions/general';
import LoginView from 'components/login_view';

function mapStateToProps(state) {
    return {
        clientConfig: state.entities.general.clientConfig,
        login: state.views.login
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...loginActions,
            getClientConfig
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(LoginView);
