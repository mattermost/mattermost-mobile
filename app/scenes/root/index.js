// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goToSelectServer} from 'app/actions/views/root';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import {goToLoadTeam} from 'app/actions/navigation';

import {loadMe} from 'mattermost-redux/actions/users';

import Root from './root';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        credentials: state.entities.general.credentials,
        hydrationComplete: state.views.root.hydrationComplete,
        logoutRequest: state.requests.users.logout,
        loginRequest: state.requests.users.login
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToLoadTeam,
            goToSelectServer,
            handleServerUrlChanged,
            loadMe
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(Root);
