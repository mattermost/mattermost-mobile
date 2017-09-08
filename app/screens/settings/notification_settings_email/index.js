// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';

import {getTheme} from 'app/selectors/preferences';

import NotificationSettingsEmail from './notification_settings_email';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        config: getConfig(state),
        myPreferences: getMyPreferences(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(NotificationSettingsEmail);
