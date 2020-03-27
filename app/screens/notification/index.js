// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadFromPushNotification} from 'app/actions/views/root';
import {getDimensions} from 'app/selectors/device';

import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';
import {getUser} from '@mm-redux/selectors/entities/users';
import {getConfig} from '@mm-redux/selectors/entities/general';

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
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Notification);
