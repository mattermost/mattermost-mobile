// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Permissions, Preferences} from 'app/constants';
import {SidebarSectionTypes} from 'app/constants/view';
import {searchChannels} from 'app/realm/actions/channel';
import {makeGroupMessageVisibleIfNecessary} from 'app/realm/actions/preference';
import {getProfilesInTeam, searchProfiles} from 'app/realm/actions/user';
import {getFilteredChannels} from 'app/realm/selectors/channel';
import {havePermission, mergeRoles} from 'app/realm/utils/role';
import {getDisplayNameSettings} from 'app/realm/utils/user';
import options from 'app/store/realm_options';

import LocalConfig from 'assets/config';

import FilteredList from './filtered_list';

const DEFAULT_SEARCH_ORDER = [
    SidebarSectionTypes.UNREADS,
    SidebarSectionTypes.DIRECT,
    SidebarSectionTypes.ALPHA,
    SidebarSectionTypes.MEMBERS,
    SidebarSectionTypes.OTHER,
    SidebarSectionTypes.ARCHIVED,
];

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const currentTeamId = general.currentTeamId;
    const users = realm.objects('User').filtered('deleteAt = 0');
    const currentUser = realm.objectForPrimaryKey('User', general.currentUserId);
    const teamMembers = realm.objects('TeamMember').filtered('id BEGINSWITH $0', currentTeamId);
    const teamChannels = realm.objects('Channel').
        filtered('(team = null OR team.id = $0)', currentTeamId);

    const preferences = realm.objects('Preference');
    const roles = realm.objects('Role');

    return [general, currentUser, preferences, users, roles, teamMembers, teamChannels];
}

function mapQueriesToProps([general, currentUser, preferences, users, roles, teamMembers, teamChannels]) {
    const config = general.config;
    const restrictDms = config?.RestrictDirectMessage === General.RESTRICT_DIRECT_MESSAGE_TEAM;
    const searchOrder = LocalConfig?.DrawerSearchOrder || DEFAULT_SEARCH_ORDER;
    const teammateDisplayNamePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT)[0];
    const teammateDisplayNameSettings = getDisplayNameSettings(config?.TeammateNameDisplay, teammateDisplayNamePref);
    const myTeamMember = teamMembers.filtered('user.id = $0', currentUser.id)[0];
    const myRoles = mergeRoles(currentUser, myTeamMember);
    const canJoinPublicChannels = havePermission(roles, myRoles, Permissions.JOIN_PUBLIC_CHANNELS);
    const locale = currentUser.locale;
    let profiles = users;
    if (restrictDms) {
        profiles = teamMembers;
    }

    const opts = {
        canJoinPublicChannels,
        currentChannelId: general.currentChannelId,
        currentUserId: currentUser.id,
        favoritesAtTop: false,
        filterArchived: true,
        locale,
        preferences,
        profiles,
        restrictDms,
        showHiddenDirectChannels: true,
        sortMentionsFirst: true,
        teamChannels,
        teammateDisplayNameSettings,
        unreadsAtTop: true,
    };

    return {
        channels: getFilteredChannels(opts),
        currentChannelId: general.currentChannelId,
        currentTeamId: general.currentTeamId,
        currentUserId: general.currentUserId,
        locale,
        restrictDms,
        searchOrder,
        teammateDisplayNameSettings,
    };
}

const mapRealmDispatchToProps = {
    getProfilesInTeam,
    makeGroupMessageVisibleIfNecessary,
    searchChannels,
    searchProfiles,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(FilteredList);
