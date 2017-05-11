// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {handleUpdateUserNotifyProps} from 'app/actions/views/account_notifications';
import {getTheme} from 'app/selectors/preferences';

import AccountNotifications from './account_notifications';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        config: state.entities.general.config,
        myPreferences: state.entities.preferences.myPreferences,
        currentUser: getCurrentUser(state),
        updateMeRequest: state.requests.users.updateMe,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleUpdateUserNotifyProps
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AccountNotifications);
