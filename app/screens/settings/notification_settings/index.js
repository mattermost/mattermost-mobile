// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUser, getStatusForUserId} from 'mattermost-redux/selectors/entities/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getMyPreferences, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';

import {handleUpdateUserNotifyProps} from 'app/actions/views/account_notifications';

import NotificationSettings from './notification_settings';

function mapStateToProps(state) {
    const config = getConfig(state);
    const currentUser = getCurrentUser(state) || {};
    const currentUserStatus = getStatusForUserId(state, currentUser.id);
    const serverVersion = state.entities.general.serverVersion;
    const enableAutoResponder = isMinimumServerVersion(serverVersion, 4, 9) && config.ExperimentalEnableAutomaticReplies === 'true';

    return {
        config,
        currentUser,
        currentUserStatus,
        myPreferences: getMyPreferences(state),
        updateMeRequest: state.requests.users.updateMe,
        theme: getTheme(state),
        enableAutoResponder,
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
