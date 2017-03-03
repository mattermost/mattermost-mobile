// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {goBack} from 'app/actions/navigation';
import {handleUpdateUserNotifyProps} from 'app/actions/views/account_notifications';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentUser} from 'service/selectors/entities/users';

import navigationSceneConnect from '../navigationSceneConnect';

import AccountNotifications from './account_notifications';

function mapStateToProps(state) {
    const {updateUserNotifyProps: updateRequest} = state.requests.users;

    return {
        config: state.entities.general.config,
        myPreferences: state.entities.preferences.myPreferences,
        currentUser: getCurrentUser(state),
        saveRequestStatus: updateRequest.status,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goBack,
            handleUpdateUserNotifyProps
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(AccountNotifications);
