// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {loadMe} from 'app/actions/realm/user';
import {GENERAL_SCHEMA_ID} from 'app/models/general';

import TestScreen from './test_screen';

import ReactRealmContext from 'app/store/realm_context';
import {reduxStore} from 'app/store';
import {handleServerUrlChanged} from 'app/actions/views/select_server';

const options = {
    context: ReactRealmContext,
};

function getCurrentUser(usersResults) {
    return usersResults ? usersResults[0] : null;
}

function mapPropsToQueries(realm) {
    //Extend Realm.Object and implement a snapshot() function if returning a objectForPrimaryKey in mapPropsToQueries
    const general = realm.objectForPrimaryKey('General', GENERAL_SCHEMA_ID);
    const users = realm.objects('User').filtered(`id="${general.currentUserId}"`);
    return [users];
}

function mapQueriesToProps([users]) {
    // the returned user is always a different object, avoid passing the full object as props to prevent re-renders
    const user = getCurrentUser(users);
    const reduxState = reduxStore.getState();

    return {
        fullName: user.fullName,
        reduxServerUrl: reduxState.entities.general.credentials.url,
    };
}

function mapRealmDispatchToProps(dispatch) {
    const actions = bindActionCreators({
        loadMe,
    }, dispatch);

    const reduxActions = bindActionCreators({
        handleServerUrlChanged,
    }, reduxStore.dispatch);

    return {
        actions,
        reduxActions,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(TestScreen);
