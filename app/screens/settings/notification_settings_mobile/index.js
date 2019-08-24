// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {isLandscape} from 'app/selectors/device';
import {updateMe} from 'mattermost-redux/actions/users';

import NotificationSettingsMobile from './notification_settings_mobile';

function mapStateToProps(state) {
    const config = getConfig(state);
    const theme = getTheme(state);
    const updateMeRequest = state.requests.users.updateMe;
    const currentUser = getCurrentUser(state);

    return {
        config,
        theme,
        updateMeRequest,
        currentUser,
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            updateMe,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(NotificationSettingsMobile);
