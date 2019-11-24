// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {patchChannel, getChannel} from 'app/realm/actions/channel';
import {General, Preferences} from 'app/constants';
import {getTheme} from 'app/realm/selectors/preference';
import options from 'app/store/realm_options';

import EditChannel from './edit_channel';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const channel = realm.objectForPrimaryKey('Channel', general.currentChannelId) || General.REALM_EMPTY_OBJECT;
    const themePreference = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);

    return [general, channel, themePreference];
}

function mapQueriesToProps([general, channel, themePreference]) {
    return {
        channel,
        theme: getTheme([general], themePreference),
    };
}

const mapRealmDispatchToProps = {
    patchChannel,
    getChannel,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(EditChannel);
