// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getConfig} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {updateMe} from '@mm-redux/actions/users';

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
