// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isLandscape} from 'app/selectors/device';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {updateChannelNotifyProps} from '@mm-redux/actions/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';

import ChannelNotificationPreference from './channel_notification_preference';

function mapStateToProps(state) {
    return {
        globalNotifyProps: getCurrentUser(state)?.notify_props,
        isLandscape: isLandscape(state),
        theme: getTheme(state),
    };
}

const mapDispatchToProps = (dispatch) => ({
    actions: bindActionCreators({
        updateChannelNotifyProps,
    }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(ChannelNotificationPreference);
