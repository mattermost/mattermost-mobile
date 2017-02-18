// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {flushToStorage, loadStorage, removeStorage} from 'app/actions/storage';
import {goToSelectServer, setStoreFromLocalData} from 'app/actions/views/root';
import {goToLoadTeam} from 'app/actions/navigation';
import {resetLogout} from 'service/actions/users';

import Root from './root';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        credentials: state.entities.general.credentials,
        logoutRequest: state.requests.users.logout,
        loginRequest: state.requests.users.login
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToLoadTeam,
            goToSelectServer,
            flushToStorage,
            loadStorage,
            removeStorage,
            setStoreFromLocalData,
            resetLogout
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(Root);
