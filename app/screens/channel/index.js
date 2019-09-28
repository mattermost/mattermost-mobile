// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';
import {getChannelStats, loadChannelsForTeam, loadSidebarDirectMessagesProfiles, selectInitialChannel} from 'app/realm/actions/channel';
import {recordLoadTime} from 'app/realm/actions/general';
import {selectDefaultTeam} from 'app/realm/actions/team';
import {getTheme} from 'app/realm/selectors/theme';
import {shouldShowTermsOfService} from 'app/realm/selectors/user';
import options from 'app/store/realm_options';

import Channel from './channel';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const themePreference = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);
    const currentUser = realm.objectForPrimaryKey('User', general.currentUserId);
    return [currentUser, general, themePreference];
}

function mapQueriesToProps([currentUser, general, themePreference]) {
    return {
        currentChannelId: general?.currentChannelId,
        currentTeamId: general?.currentTeamId,
        currentUserId: currentUser?.id,
        theme: getTheme([general], themePreference),
        showTermsOfService: shouldShowTermsOfService(currentUser, general),
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
