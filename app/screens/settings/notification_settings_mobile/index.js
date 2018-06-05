// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import NotificationSettingsMobile from './notification_settings_mobile';

function mapStateToProps(state) {
    return {
        config: getConfig(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(NotificationSettingsMobile);
