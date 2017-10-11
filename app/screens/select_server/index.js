// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getPing, resetPing} from 'mattermost-redux/actions/general';
import {RequestStatus} from 'mattermost-redux/constants';

import {handleServerUrlChanged} from 'app/actions/views/select_server';
import {getTheme} from 'app/selectors/preferences';

import SelectServer from './select_server';

function mapStateToProps(state) {
    const {config: configRequest, license: licenseRequest, server: pingRequest} = state.requests.general;
    const {config, license} = state.entities.general;

    const success = RequestStatus.SUCCESS;
    const transition = (pingRequest.status === success && configRequest.status === success && licenseRequest.status === success);

    return {
        ...state.views.selectServer,
        pingRequest,
        configRequest,
        licenseRequest,
        config,
        license,
        transition,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleServerUrlChanged,
            getPing,
            resetPing
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectServer);
