// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {Preferences} from 'mattermost-redux/constants';

import {savePreferences} from 'mattermost-redux/actions/preferences';
import {updateMe} from 'mattermost-redux/actions/users';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {
    get as getPreference,
    getTheme,
} from 'mattermost-redux/selectors/entities/preferences';
import {isLandscape} from 'app/selectors/device';
import NotificationSettingsEmail from './notification_settings_email';

function mapStateToProps(state) {
    const config = getConfig(state);
    const sendEmailNotifications = config.SendEmailNotifications === 'true';
    const enableEmailBatching = config.EnableEmailBatching === 'true';
    const emailInterval = getPreference(
        state,
        Preferences.CATEGORY_NOTIFICATIONS,
        Preferences.EMAIL_INTERVAL,
        Preferences.INTERVAL_NOT_SET.toString(),
    );

    return {
        enableEmailBatching,
        emailInterval,
        sendEmailNotifications,
        siteName: config.siteName || '',
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            savePreferences,
            updateMe,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(NotificationSettingsEmail);
