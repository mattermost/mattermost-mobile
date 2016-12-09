// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getPing} from 'service/actions/general';
import {goToLogin} from 'app/actions/navigation';
import * as SelectServerActions from 'app/actions/views/select_server';

import SelectServer from './select_server';

function mapStateToProps(state) {
    return {
        ...state.views.selectServer,
        server: state.requests.general.server
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...SelectServerActions,
            getPing,
            goToLogin
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectServer);
