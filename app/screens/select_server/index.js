// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getPing, resetPing} from 'mattermost-redux/actions/general';
import {RequestStatus} from 'mattermost-redux/constants';

import {setLastUpgradeCheck} from 'app/actions/views/client_upgrade';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import getClientUpgrade from 'app/selectors/client_upgrade';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import SelectServer from './select_server';

function mapStateToProps(state) {
    const {config: configRequest, license: licenseRequest, server: pingRequest} = state.requests.general;
    const {config, license} = state.entities.general;
    const {currentVersion, latestVersion, minVersion} = getClientUpgrade(state);

    const success = RequestStatus.SUCCESS;
    const transition = (pingRequest.status === success && configRequest.status === success && licenseRequest.status === success);

    return {
        ...state.views.selectServer,
        config,
        configRequest,
        currentVersion,
        pingRequest,
        latestVersion,
        license,
        licenseRequest,
        minVersion,
        theme: getTheme(state),
        transition
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getPing,
            handleServerUrlChanged,
            resetPing,
            setLastUpgradeCheck
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectServer);
