// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, DeviceTypes, Permissions, Preferences} from 'app/constants';

import {getSortedChannelIds, getSortedUnreadChannelIds, getSortedFavoriteChannelIds} from 'app/realm/selectors/channel';
import {getSidebarPreferences} from 'app/realm/selectors/preference';
import {havePermission, mergeRoles} from 'app/realm/utils/role';
import {getDisplayNameSettings} from 'app/realm/utils/user';
import options from 'app/store/realm_options';

import List from './list';

function mapPropsToQueries(realm, ownProps) {
    const {currentTeamId} = ownProps;
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const currentUser = realm.objectForPrimaryKey('User', general.currentUserId);
    const preferences = realm.objects('Preference');
    const teamChannels = realm.objects('Channel').filtered('(team = null OR team.id = $0) AND members.user.id=$1', currentTeamId, currentUser.id);
    const teamMember = realm.objectForPrimaryKey('TeamMember', `${currentTeamId}-${currentUser.id}`);
    const roles = realm.objects('Role');

    return [general, currentUser, preferences, teamChannels, teamMember, roles];
}

function mapQueriesToProps([general, currentUser, preferences, teamChannels, teamMember, roles]) {
    const config = general.config;
    const sidebarPrefs = getSidebarPreferences(config, preferences);
    const teammateDisplayNamePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT)[0];
    const teammateDisplayNameSettings = getDisplayNameSettings(config?.TeammateNameDisplay, teammateDisplayNamePref);

    const opts = {
        closeUnusedDirectMessages: config?.CloseUnusedDirectMessages,
        teammateDisplayNameSettings,
        currentChannelId: general.currentChannelId,
        currentUserId: currentUser.id,
        teamChannels,
        favoritesAtTop: sidebarPrefs.favorite_at_top === 'true',
        grouping: sidebarPrefs.grouping,
        lastUnreadChannelId: DeviceTypes.IS_TABLET ? '' : null, // TODO: Keep track of this value in redux or the general table
        locale: currentUser.locale,
        preferences,
        sortingType: sidebarPrefs.sorting,
        sortMentionsFirst: true,
        unreadsAtTop: true,
    };

    const unreadChannelIds = getSortedUnreadChannelIds(opts);
    const favoriteChannelIds = getSortedFavoriteChannelIds(opts);
    const orderedChannelIds = getSortedChannelIds(opts);
    const myRoles = mergeRoles(currentUser, teamMember);
    const canJoinPublicChannels = havePermission(roles, myRoles, Permissions.JOIN_PUBLIC_CHANNELS);
    const canCreatePublicChannels = havePermission(roles, myRoles, Permissions.CREATE_PUBLIC_CHANNEL);
    const canCreatePrivateChannels = havePermission(roles, myRoles, Permissions.CREATE_PRIVATE_CHANNEL);

    return {
        canJoinPublicChannels,
        canCreatePrivateChannels,
        canCreatePublicChannels,
        favoriteChannelIds,
        unreadChannelIds,
        orderedChannelIds,
        teammateDisplayNameSettings,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(List);
