// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {RequestStatus} from 'mattermost-redux/constants';
import {getConnection} from 'app/selectors/device';

import RetryBarIndicator from './retry_bar_indicator';

function mapStateToProps(state) {
    const {websocket: websocketRequest} = state.requests.general;
    const networkOnline = getConnection(state);
    const webSocketOnline = websocketRequest.status === RequestStatus.SUCCESS;

    let failed = state.views.channel.retryFailed && webSocketOnline;
    if (!networkOnline) {
        failed = false;
    }

    return {
        failed,
    };
}
export default connect(mapStateToProps)(RetryBarIndicator);
