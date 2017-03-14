// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import Config from 'assets/config.json';

import {flushToStorage} from 'app/actions/storage';
import {goToNotification, loadConfigAndLicense, queueNotification} from 'app/actions/views/root';
import {setAppState, setDeviceToken} from 'mattermost-redux/actions/general';

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
        locale
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadConfigAndLicense,
            goToNotification,
            queueNotification,
            setAppState,
            setDeviceToken,
            flushToStorage
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Root);
