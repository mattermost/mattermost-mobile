// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {logError} from '@mm-redux/actions/errors';
import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {setLastUpgradeCheck} from 'app/actions/views/client_upgrade';
import getClientUpgrade from 'app/selectors/client_upgrade';
import {isLandscape} from 'app/selectors/device';

import ClientUpgradeListener from './client_upgrade_listener';

function mapStateToProps(state) {
    const {currentVersion, downloadLink, forceUpgrade, latestVersion, minVersion} = getClientUpgrade(state);

    return {
        currentVersion,
        downloadLink,
        forceUpgrade,
        isLandscape: isLandscape(state),
        lastUpgradeCheck: state.views.clientUpgrade.lastUpdateCheck,
        latestVersion,
        minVersion,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            logError,
            setLastUpgradeCheck,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ClientUpgradeListener);
