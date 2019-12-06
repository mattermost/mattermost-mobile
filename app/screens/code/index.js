// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';
import {getTheme} from 'app/realm/selectors/preference';
import options from 'app/store/realm_options';

import Code from './code';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const themePreferences = realm.objects('Preference').filtered('category = $0', Preferences.CATEGORY_THEME);

    return [general, themePreferences];
}

function mapQueriesToProps([general, themePreferences]) {
    return {
        theme: getTheme([general], themePreferences),
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(Code);