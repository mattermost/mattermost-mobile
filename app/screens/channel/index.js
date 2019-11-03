// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';
import {getChannelStats, loadChannelsForTeam, loadSidebarDirectMessagesProfiles, selectInitialChannel} from 'app/realm/actions/channel';
import {recordLoadTime} from 'app/realm/actions/general';
import {getTheme} from 'app/realm/selectors/preference';
import {selectDefaultTeam} from 'app/realm/actions/team';
import {shouldShowTermsOfService} from 'app/realm/selectors/user';
import options from 'app/store/realm_options';

import Channel from './channel';

function mapPropsToQueries(realm) {
    // Assigning REALM_EMPTY_OBJECT to handle the case when upgrading from redux to realm and the user is logged in
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const themePreference = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);
    const currentUser = realm.objectForPrimaryKey('User', general?.currentUserId || '') || General.REALM_EMPTY_OBJECT;
    return [currentUser, general, themePreference];
}

function mapQueriesToProps([currentUser, general, themePreference]) {
    let theme;
    let showTermsOfService = false;

    if (general?.currentUserId) {
        theme = getTheme([general], themePreference);
        showTermsOfService = shouldShowTermsOfService(currentUser, general);
    } else {
        theme = Preferences.THEMES.default;
    }

    return {
        currentChannelId: general?.currentChannelId,
        currentTeamId: general?.currentTeamId,
        currentUserId: currentUser?.id,
        theme,
        showTermsOfService,
    };
}

const mapRealmDispatchToProps = {
    getChannelStats,
    loadChannelsForTeam,
    loadSidebarDirectMessagesProfiles,
    selectDefaultTeam,
    selectInitialChannel,
    recordLoadTime,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(Channel);
