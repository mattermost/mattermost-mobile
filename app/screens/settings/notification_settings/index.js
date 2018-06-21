// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {getMyPreferences, getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {handleUpdateUserNotifyProps} from 'app/actions/views/account_notifications';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import NotificationSettings from './notification_settings';

function mapStateToProps(state) {
    const config = getConfig(state);
    return {
        config,
        currentUser: getCurrentUser(state),
        myPreferences: getMyPreferences(state),
        updateMeRequest: state.requests.users.updateMe,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleUpdateUserNotifyProps,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(NotificationSettings);
