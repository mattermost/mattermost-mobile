// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import Config from 'assets/config.json';

import {closeDrawers, closeModal, goBack, unrenderDrawer} from 'app/actions/navigation';
import {goToNotification, loadConfigAndLicense, queueNotification} from 'app/actions/views/root';
import {setAppState, setDeviceToken} from 'mattermost-redux/actions/general';
import {logout} from 'mattermost-redux/actions/users';

import Root from './root';

function mapStateToProps(state, ownProps) {
    const users = state.entities.users;
    const {currentUserId} = users;
    const {currentTeamId} = state.entities.teams;
    const {currentChannelId} = state.entities.channels;

    let locale = Config.DefaultLocale;
    if (currentUserId && users.profiles[currentUserId]) {
        locale = users.profiles[currentUserId].locale;
    }

    return {
        ...ownProps,
        currentTeamId,
        currentChannelId,
        locale,
        navigation: state.navigation
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeDrawers,
            closeModal,
            goBack,
            loadConfigAndLicense,
            logout,
            goToNotification,
            queueNotification,
            setAppState,
            setDeviceToken,
            unrenderDrawer
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
