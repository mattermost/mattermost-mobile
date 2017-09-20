// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {close as closeWebSocket, init as initWebSocket} from 'mattermost-redux/actions/websocket';

import {getConnection} from 'app/selectors/device';

import OfflineIndicator from './offline_indicator';

function mapStateToProps(state, ownProps) {
    const {websocket} = state.requests.general;
    const {appState} = state.entities.general;
    const webSocketStatus = websocket.status;
    const isConnecting = websocket.error >= 2;

    return {
        appState,
        isConnecting,
        isOnline: getConnection(state),
        webSocketStatus,
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeWebSocket,
            initWebSocket
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(OfflineIndicator);
