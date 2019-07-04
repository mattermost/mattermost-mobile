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

import Preferences from 'app/constants/preferences';
import {getCurrentUser} from 'app/selectors/realm/general';
import {getTheme} from 'app/selectors/realm/theme';

const options = {
    context: ReactRealmContext,
    allowUnsafeWrites: true,
    watchUnsafeWrites: true,
};

function mapPropsToQueries(realm) {
    //Extend Realm.Object function if returning a objectForPrimaryKey in mapPropsToQueries
    // this sort of queries or returning a single object won't live update
    // const general = realm.objectForPrimaryKey('General', GENERAL_SCHEMA_ID);

    const general = realm.objects('General').filtered(`id="${GENERAL_SCHEMA_ID}"`);
    const users = realm.objects('User').filtered(`id="${general[0]?.currentUserId}"`);
    const themePreference = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);
    return [users, themePreference, general];
}

function mapQueriesToProps([users, themePreference, general]) {
    // the returned user is always a different object, avoid passing the full object as props to prevent re-renders
    const user = getCurrentUser(users);
    const reduxState = reduxStore.getState();

    return {
        user,
        theme: getTheme(general, themePreference),
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
