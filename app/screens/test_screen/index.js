// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {realmConnect} from 'realm-react-redux';

import {loadMe} from 'app/realm/actions/user';

import TestScreen from './test_screen';

import options from 'app/store/realm_context_options';
import {reduxStore} from 'app/store';
import {handleServerUrlChanged} from 'app/actions/views/select_server';

import {General, Preferences} from 'app/constants';
import {getCurrentUser} from 'app/realm/selectors/general';
import {getTheme} from 'app/realm/selectors/theme';

function mapPropsToQueries(realm) {
    //Extend Realm.Object function if returning a objectForPrimaryKey in mapPropsToQueries
    // this sort of queries or returning a single object won't live update
    // const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

    const general = realm.objects('General').filtered(`id="${General.REALM_SCHEMA_ID}"`);
    const users = realm.objects('User').filtered(`id="${general[0]?.currentUserId}"`);
    const themePreference = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);
    const channels = realm.objects('Channel').filtered('type=$0', General.OPEN_CHANNEL);
    return [users, themePreference, general, channels];
}

function mapQueriesToProps([users, themePreference, general, channels]) {
    // the returned user is always a different object, avoid passing the full object as props to prevent re-renders
    const user = getCurrentUser(users);
    const reduxState = reduxStore.getState();

    return {
        user,
        items: channels.map((c) => c.id),
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
