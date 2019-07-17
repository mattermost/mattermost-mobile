// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadFromPushNotification} from 'app/actions/views/root';
import {getDimensions} from 'app/selectors/device';

import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getUser} from 'mattermost-redux/selectors/entities/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {dismissOverlay, dismissAllModals, popToRoot} from 'app/actions/navigation';

import Notification from './notification';

function mapStateToProps(state, ownProps) {
    const {data} = ownProps.notification;
    const {deviceWidth} = getDimensions(state);

    let user;
    if (data.sender_id) {
        user = getUser(state, data.sender_id);
    }

    let channel;
    if (data.channel_id) {
        channel = getChannel(state, data.channel_id);
    }
    const config = getConfig(state);
    return {
        config,
        channel,
        deviceWidth,
        user,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadFromPushNotification,
            dismissOverlay,
            dismissAllModals,
            popToRoot,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Notification);
