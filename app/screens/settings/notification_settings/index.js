// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {updateMe} from '@mm-redux/actions/users';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getMyPreferences, getTheme, isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser, getStatusForUserId} from '@mm-redux/selectors/entities/users';
import {isLandscape} from '@selectors/device';

import NotificationSettings from './notification_settings';

function mapStateToProps(state) {
    const config = getConfig(state);
    const currentUser = getCurrentUser(state) || {};
    const currentUserStatus = getStatusForUserId(state, currentUser.id);
    const enableAutoResponder = config.ExperimentalEnableAutomaticReplies === 'true';

    return {
        config,
        currentUser,
        currentUserStatus,
        myPreferences: getMyPreferences(state),
        updateMeRequest: state.requests.users.updateMe,
        theme: getTheme(state),
        enableAutoResponder,
        isLandscape: isLandscape(state),
        isCollapsedThreadsEnabled: isCollapsedThreadsEnabled(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            updateMe,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(NotificationSettings);
