// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import NotificationSettingsEmail from './notification_settings_email';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        config: state.entities.general.config,
        myPreferences: state.entities.preferences.myPreferences,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(NotificationSettingsEmail);
