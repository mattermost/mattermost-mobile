// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {Preferences} from 'mattermost-redux/constants';

import {savePreferences} from 'mattermost-redux/actions/preferences';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {
    get as getPreference,
    getTheme,
} from 'mattermost-redux/selectors/entities/preferences';

import NotificationSettingsEmailAndroid from './notification_settings_email_android';

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

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            savePreferences,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(NotificationSettingsEmailAndroid);
