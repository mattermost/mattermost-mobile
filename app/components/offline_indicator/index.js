// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getConnection} from 'app/selectors/device';

import OfflineIndicator from './offline_indicator';

function mapStateToProps(state) {
    const {websocket} = state.requests.general;
    const webSocketStatus = websocket.status;
    const isConnecting = websocket.error > 1;

    return {
        isConnecting,
        isOnline: getConnection(state),
        webSocketStatus
    };
}

export default connect(mapStateToProps)(OfflineIndicator);
