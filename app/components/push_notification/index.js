// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToNotification, queueNotification} from 'app/actions/views/root';
import {setDeviceToken} from 'service/actions/general';
import {getUnreads} from 'service/selectors/entities/channels';

import PushNotification from './push_notification';

function mapStateToProps(state, ownProps) {
    const {currentId: currentTeamId} = state.entities.teams;
    const {currentId: currentChannelId} = state.entities.channels;

    return {
        ...ownProps,
        currentTeamId,
        currentChannelId,
        ...getUnreads(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToNotification,
            queueNotification,
            setDeviceToken
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PushNotification);
