// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';

import {getClientUpgrade} from 'app/realm/utils/general';
import {getTheme} from 'app/realm/selectors/preference';
import options from 'app/store/realm_options';

import ClientUpgrade from './client_upgrade';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const themePreferences = realm.objects('Preference').filtered('category = $0', Preferences.CATEGORY_THEME);

    return [general, themePreferences];
}

function mapQueriesToProps([general, themePreferences]) {
    const {currentVersion, downloadLink, forceUpgrade, latestVersion, minVersion} = getClientUpgrade(general);

    return {
        currentVersion,
        downloadLink,
        forceUpgrade,
        latestVersion,
        minVersion,
        theme: getTheme([general], themePreferences),
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(ClientUpgrade);
