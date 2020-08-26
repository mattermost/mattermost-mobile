// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {updateChannelNotifyProps} from '@mm-redux/actions/channels';

import ChannelNotificationPreference from './channel_notification_preference';

const mapDispatchToProps = (dispatch) => ({
    actions: bindActionCreators({
        updateChannelNotifyProps,
    }, dispatch),
});

export default connect(null, mapDispatchToProps)(ChannelNotificationPreference);
