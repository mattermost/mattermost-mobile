// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {setLastUpgradeCheck} from 'app/actions/views/client_upgrade';
import {loadConfigAndLicense, pingServer, scheduleExpiredNotification} from 'app/realm/actions/general';
import {login} from 'app/realm/actions/user';
import {handleServerUrlChanged} from 'app/actions/views/select_server';
import options from 'app/store/realm_options';
import {reduxStore} from 'app/store';

import SelectServer from './select_server';

function mapQueriesToProps() {
    const state = reduxStore.getState();

    return {
        ...state.views.selectServer,
    };
}

function mapRealmDispatchToProps(dispatch) {
    const actions = bindActionCreators({
        loadConfigAndLicense,
        login,
        pingServer,
        scheduleExpiredNotification,
    }, dispatch);

    const reduxActions = bindActionCreators({
        handleServerUrlChanged,
        setLastUpgradeCheck,
    }, reduxStore.dispatch);
    return {
        ...actions,
        reduxActions,
    };
}

export default realmConnect(null, mapQueriesToProps, mapRealmDispatchToProps, null, options)(SelectServer);
