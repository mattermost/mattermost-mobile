import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {logError} from 'mattermost-redux/actions/errors';

import {setLastUpgradeCheck} from 'app/actions/views/client_upgrade';
import getClientUpgrade from 'app/selectors/client_upgrade';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ClientUpgrade from './client_upgrade';

function mapStateToProps(state) {
    const {currentVersion, downloadLink, forceUpgrade, latestVersion, minVersion} = getClientUpgrade(state);

    return {
        currentVersion,
        downloadLink,
        forceUpgrade,
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

export default connect(mapStateToProps, mapDispatchToProps)(ClientUpgrade);
