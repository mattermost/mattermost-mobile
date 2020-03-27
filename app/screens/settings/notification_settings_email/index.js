// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {Preferences} from '@redux/constants';

import {savePreferences} from '@redux/actions/preferences';
import {updateMe} from '@redux/actions/users';

import {getCurrentUser} from '@redux/selectors/entities/users';
import {getConfig} from '@redux/selectors/entities/general';
import {
    get as getPreference,
    getTheme,
} from '@redux/selectors/entities/preferences';

import {isLandscape} from 'app/selectors/device';
import {getNotificationProps} from 'app/utils/notify_props';

import NotificationSettingsEmail from './notification_settings_email';

function mapStateToProps(state) {
    const currentUser = getCurrentUser(state) || {};
    const notifyProps = getNotificationProps(currentUser);

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
        currentUser,
        notifyProps,
        enableEmailBatching,
        emailInterval,
        sendEmailNotifications,
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
