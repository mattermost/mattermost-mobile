// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {Preferences} from 'mattermost-redux/constants';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {
    get as getPreference,
    getTheme,
} from 'mattermost-redux/selectors/entities/preferences';

import NotificationSettingsEmail from './notification_settings_email';

function mapStateToProps(state) {
    const config = getConfig(state);
    const sendEmailNotifications = config.SendEmailNotifications === 'true';
    const enableEmailBatching = config.EnableEmailBatching === 'true';
    const emailInterval = getPreference(
        state,
        Preferences.CATEGORY_NOTIFICATIONS,
        Preferences.EMAIL_INTERVAL,
        Preferences.INTERVAL_NEVER
    );

    return {
        enableEmailBatching,
        emailInterval,
        sendEmailNotifications,
        siteName: config.siteName || '',
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(NotificationSettingsEmail);
