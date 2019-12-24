// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';
import {getTheme} from 'app/realm/selectors/preference';
import options from 'app/store/realm_options';

import About from './about';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const themePreferences = realm.objects('Preference').filtered('category = $0', Preferences.CATEGORY_THEME);

    return [general, themePreferences];
}

function mapQueriesToProps([general, themePreferences]) {
    return {
        config: general?.config || JSON.parse(general?.serverConfig),
        license: general?.license || JSON.parse(general?.serverLicense),
        theme: getTheme([general], themePreferences),
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(About);
