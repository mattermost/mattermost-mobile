// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getMyPreferences, getTheme} from 'mattermost-redux/selectors/entities/preferences';

import NotificationSettingsEmail from './notification_settings_email';

function mapStateToProps(state) {
    return {
        config: getConfig(state),
        myPreferences: getMyPreferences(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(NotificationSettingsEmail);
