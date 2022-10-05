// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@mm-redux/constants';
import Permissions from '@mm-redux/constants/permissions';
import {getCategoriesWithFilteredChannelIds} from '@mm-redux/selectors/entities/channel_categories';
import {
    getSortedFavoriteChannelIds,
    getSortedUnreadChannelIds,
    getOrderedChannelIds,
    getCurrentChannelId,
} from '@mm-redux/selectors/entities/channels';
import {getTheme, getFavoritesPreferences, getSidebarPreferences, isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {haveITeamPermission} from '@mm-redux/selectors/entities/roles';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {showCreateOption} from '@mm-redux/utils/channel_utils';
import {memoizeResult} from '@mm-redux/utils/helpers';
import {connect} from 'react-redux';

import {DeviceTypes, ViewTypes} from '@constants';
import {shouldShowLegacySidebar} from '@utils/categories';

import List from './list';

const filterZeroUnreads = memoizeResult((sections) => {
    return sections.filter((s) => {
        if (s.type === ViewTypes.SidebarSectionTypes.UNREADS) {
            return s.items.length > 0;
        }
        return true;
    });
});

function mapStateToProps(state) {
    const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
    const currentTeamId = getCurrentTeamId(state);
    const sidebarPrefs = getSidebarPreferences(state);
    const lastUnreadChannel = DeviceTypes.IS_TABLET ? state.views.channel.keepChannelIdAsUnread : null;

    // Unreads should always be on top in mobile (for now)
    /*
    const unreadsOnTop = getBool(state,
        Preferences.CATEGORY_SIDEBAR_SETTINGS,
        'show_unread_section');
    */
    const unreadsOnTop = true;

    const unreadChannelIds = getSortedUnreadChannelIds(state, lastUnreadChannel);
    const favoriteChannelIds = getSortedFavoriteChannelIds(state);
    const orderedChannelIds = filterZeroUnreads(getOrderedChannelIds(
        state,
        lastUnreadChannel,
        sidebarPrefs.grouping,
        sidebarPrefs.sorting,
        true, // The mobile app should always display the Unreads section regardless of user settings (MM-13420)
        sidebarPrefs.favorite_at_top === 'true' && favoriteChannelIds.length,
    ));

    // Grab our categories and channels
    const categories = getCategoriesWithFilteredChannelIds(state);

    const currentChannelId = getCurrentChannelId(state);

    const canJoinPublicChannels = haveITeamPermission(state, {
        team: currentTeamId,
        permission: Permissions.JOIN_PUBLIC_CHANNELS,
    });
    const canCreatePublicChannels = showCreateOption(state, currentTeamId, General.OPEN_CHANNEL);
    const canCreatePrivateChannels = showCreateOption(state, currentTeamId, General.PRIVATE_CHANNEL);

    const showLegacySidebar = shouldShowLegacySidebar(state);

    return {
        theme: getTheme(state),
        canJoinPublicChannels,
        canCreatePrivateChannels,
        canCreatePublicChannels,
        collapsedThreadsEnabled,
        unreadChannelIds,
        favoriteChannelIds,
        orderedChannelIds,
        categories,
        showLegacySidebar,
        unreadsOnTop,
        currentChannelId,
        currentTeamId,
    };
}

function areStatesEqual(next, prev) {
    const equalRoles = getCurrentUserRoles(prev) === getCurrentUserRoles(next);
    const equalChannels = next.entities.channels === prev.entities.channels;
    const equalConfig = next.entities.general.config === prev.entities.general.config;
    const equalUsers = next.entities.users.profiles === prev.entities.users.profiles;
    const equalFav = getFavoritesPreferences(next) === getFavoritesPreferences(prev);

    return equalChannels && equalConfig && equalRoles && equalUsers && equalFav;
}

export default connect(mapStateToProps, null, null, {areStatesEqual})(List);
