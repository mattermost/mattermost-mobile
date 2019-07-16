// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {resetToChannel, goToScreen} from 'app/actions/navigation';
import {scheduleExpiredNotification, sendPasswordResetEmail} from 'app/realm/actions/general';
import {login} from 'app/realm/actions/user';
import options from 'app/store/realm_context_options';
import {reduxStore} from 'app/store';

import Login from './login.js';

function mapQueriesToProps() {
    const state = reduxStore.getState();
    const {loginId} = state.views.login;

    return {
        loginId,
    };
}

const mapRealmDispatchToProps = {
    goToScreen,
    login,
    resetToChannel,
    scheduleExpiredNotification,
    sendPasswordResetEmail,
};

export default realmConnect(null, mapQueriesToProps, mapRealmDispatchToProps, null, options)(Login);
