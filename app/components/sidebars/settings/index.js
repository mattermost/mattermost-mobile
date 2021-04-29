// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {setStatus} from '@mm-redux/actions/users';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser, getStatusForUserId} from '@mm-redux/selectors/entities/users';

import {logout} from 'app/actions/views/user';
import {unsetCustomStatus} from '@actions/views/custom_status';

import SettingsSidebar from './settings_sidebar';
import {isCustomStatusEnabled, makeGetCustomStatus} from '@selectors/custom_status';

import {getUserTimezone} from '@mm-redux/selectors/entities/timezone';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';

function mapStateToProps(state) {
    const currentUser = getCurrentUser(state) || {};
    const status = getStatusForUserId(state, currentUser.id);
    const getCustomStatus = makeGetCustomStatus();
    const currentUserId = getCurrentUserId(state);
    const userTimezone = getUserTimezone(state, currentUserId);
    return {
        userTimezone,
        currentUser,
        locale: currentUser?.locale,
        status,
        theme: getTheme(state),
        isCustomStatusEnabled: isCustomStatusEnabled(state),
        customStatus: getCustomStatus(state) || {},
        setStatusRequestStatus: state.requests.users?.setCustomStatus?.status,
        clearStatusRequestStatus: state.requests.users?.clearCustomStatus?.status,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            logout,
            setStatus,
            unsetCustomStatus,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {forwardRef: true})(SettingsSidebar);
