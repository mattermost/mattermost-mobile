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

function getCurrentUser(generalResults, usersResults) {
    const general = generalResults.filtered(`id="${GENERAL_SCHEMA_ID}"`)[0];
    let user = null;
    if (general?.currentUserId) {
        user = usersResults.filtered(`id="${general.currentUserId}"`)[0];
    }

    return user;
}

function mapPropsToQueries(realm) {
    const general = realm.objects('General');
    const users = realm.objects('User');
    return [general, users];
}

function mapQueriesToProps([general, users]) {
    const user = getCurrentUser(general, users);
    const reduxState = reduxStore.getState();

    return {
        user,
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
