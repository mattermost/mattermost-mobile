// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {updateChannelNotifyProps} from '@mm-redux/actions/channels';
import {getMyCurrentChannelMembership} from '@mm-redux/selectors/entities/channels';

import {isLandscape} from 'app/selectors/device';
import ChannelNotificationPreference from './channel_notification_preference';

function mapStateToProps(state) {
    return {
        channelMember: getMyCurrentChannelMembership(state),
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

const mapDispatchToProps = (dispatch) => ({
    actions: bindActionCreators({
        updateChannelNotifyProps,
    }, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(ChannelNotificationPreference);
