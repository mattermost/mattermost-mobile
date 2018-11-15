// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {startPeriodicStatusUpdates, stopPeriodicStatusUpdates, logout} from 'mattermost-redux/actions/users';
import {init as initWebSocket, close as closeWebSocket} from 'mattermost-redux/actions/websocket';

import {connection} from 'app/actions/device';
import {getConnection, isLandscape} from 'app/selectors/device';

import NetworkIndicator from './network_indicator';

function mapStateToProps(state) {
    const {websocket} = state.requests.general;
    const websocketStatus = websocket.status;

    return {
        isLandscape: isLandscape(state),
        isOnline: getConnection(state),
        websocketErrorCount: websocket.error,
        websocketStatus,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeWebSocket,
            connection,
            initWebSocket,
            logout,
            startPeriodicStatusUpdates,
            stopPeriodicStatusUpdates,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(NetworkIndicator);
