// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getPing, resetPing, setServerVersion} from 'mattermost-redux/actions/general';

import {setLastUpgradeCheck} from 'app/actions/views/client_upgrade';
import {loadConfigAndLicense} from 'app/actions/views/root';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import getClientUpgrade from 'app/selectors/client_upgrade';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import SelectServer from './select_server';

function mapStateToProps(state) {
    const {config, license} = state.entities.general;
    const {currentVersion, latestVersion, minVersion} = getClientUpgrade(state);

    return {
        ...state.views.selectServer,
        config,
        currentVersion,
        hasConfigAndLicense: Object.keys(config).length > 0 && Object.keys(license).length > 0,
        latestVersion,
        license,
        minVersion,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getPing,
            handleServerUrlChanged,
            loadConfigAndLicense,
            resetPing,
            setLastUpgradeCheck,
            setServerVersion,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectServer);
