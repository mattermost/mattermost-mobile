// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {close as closeWebSocket, init as initWebSocket} from 'mattermost-redux/actions/websocket';

import OfflineIndicator from './offline_indicator';

function mapStateToProps(state, ownProps) {
    const {websocket} = state.requests.general;
    const {appState} = state.entities.general;
    const {connection} = state.views;

    return {
        appState,
        isOnline: connection,
        websocket,
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
