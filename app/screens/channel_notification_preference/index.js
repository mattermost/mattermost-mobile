// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {updateChannelNotifyProps} from '@mm-redux/actions/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {isLandscape} from 'app/selectors/device';

import ChannelNotificationPreference from './channel_notification_preference';

function mapStateToProps(state) {
    const theme = getTheme(state);
    return {
        theme,
        isLandscape: isLandscape(state),
    };
}

const mapDispatchToProps = (dispatch) => ({
    actions: bindActionCreators({
        updateChannelNotifyProps,
    }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(ChannelNotificationPreference);
