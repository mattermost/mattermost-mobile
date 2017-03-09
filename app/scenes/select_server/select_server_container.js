// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {getPing, resetPing} from 'service/actions/general';
import {RequestStatus} from 'service/constants';
import * as SelectServerActions from 'app/actions/views/select_server';

import SelectServer from './select_server';

function mapStateToProps(state) {
    const {config: configRequest, license: licenseRequest, server: pingRequest} = state.requests.general;

    const success = RequestStatus.SUCCESS;
    const transition = (pingRequest.status === success && configRequest.status === success && licenseRequest.status === success);

    return {
        ...state.views.selectServer,
        pingRequest,
        configRequest,
        licenseRequest,
        transition
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            ...SelectServerActions,
            getPing,
            resetPing
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(SelectServer);
