// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {scheduleExpiredNotification, sendPasswordResetEmail} from 'app/actions/realm/general';
import {login} from 'app/actions/realm/user';
import ReactRealmContext from 'app/store/realm_context';
import {reduxStore} from 'app/store';

import Login from './login.js';

const options = {
    context: ReactRealmContext,
};

function mapQueriesToProps() {
    const state = reduxStore.getState();
    const {loginId} = state.views.login;

    return {
        loginId,
    };
}

function mapRealmDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            login,
            scheduleExpiredNotification,
            sendPasswordResetEmail,
        }, dispatch),
    };
}

export default realmConnect(null, mapQueriesToProps, mapRealmDispatchToProps, null, options)(Login);
