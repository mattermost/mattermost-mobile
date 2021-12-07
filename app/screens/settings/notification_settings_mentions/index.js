// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme, isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';

import NotificationSettingsMentions from './notification_settings_mentions';

function mapStateToProps(state) {
    return {
        isCollapsedThreadsEnabled: isCollapsedThreadsEnabled(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(NotificationSettingsMentions);
