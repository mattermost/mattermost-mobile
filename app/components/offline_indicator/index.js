// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {init as initWebSocket} from 'mattermost-redux/actions/websocket';

import {connection} from 'app/actions/device';
import {getConnection, isLandscape} from 'app/selectors/device';

import OfflineIndicator from './offline_indicator';

function mapStateToProps(state) {
    const {websocket} = state.requests.general;
    const webSocketStatus = websocket.status;
    const isConnecting = websocket.error > 1;

    return {
        isConnecting,
        isLandscape: isLandscape(state),
        isOnline: getConnection(state),
        webSocketStatus,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            connection,
            initWebSocket,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(OfflineIndicator);
