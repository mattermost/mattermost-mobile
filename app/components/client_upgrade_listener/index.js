import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {logError} from 'mattermost-redux/actions/errors';

import {setLastUpgradeCheck} from 'app/actions/views/client_upgrade';
import getClientUpgrade from 'app/selectors/client_upgrade';
import {isLandscape} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

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
