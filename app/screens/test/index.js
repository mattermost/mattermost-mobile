// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {loadMe} from 'app/actions/realm/user';
import {loadConfigAndLicense} from 'app/actions/realm/general';
import {GENERAL_SCHEMA_ID} from 'app/models/general';

import Test from './test';

import ReactRealmContext from 'app/store/realm_context';
import {reduxStore} from 'app/store';
import {handleServerUrlChanged} from 'app/actions/views/select_server';

const options = {
    context: ReactRealmContext,
};

function getCurrentUser(users) {
    return users?.length && users[0];
}

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', GENERAL_SCHEMA_ID);
    let users = null;
    if (general?.currentUserId) {
        users = realm.objects('User').filtered(`id="${general.currentUserId}"`);
    }
    return [users];
}

function mapQueriesToProps([general]) {
    const user = getCurrentUser(general);
    const reduxState = reduxStore.getState();

    return {
        user,
        reduxServerUrl: reduxState.entities.general.credentials.url,
    };
}

function mapRealmDispatchToProps(dispatch) {
    const actions = bindActionCreators({
        loadMe,
        loadConfigAndLicense,
    }, dispatch);

    const reduxActions = bindActionCreators({
        handleServerUrlChanged,
    }, reduxStore.dispatch);

    return {
        actions,
        reduxActions,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(Test);
