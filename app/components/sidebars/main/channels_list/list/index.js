// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {
    getFavoriteChannelIds,
    getSortedUnreadChannelIds,
    getOrderedChannelIds,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getTheme, getFavoritesPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {getSidebarPreferences} from 'mattermost-redux/selectors/entities/sidebar';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {memoizeResult} from 'mattermost-redux/utils/helpers';
import {isAdmin as checkIsAdmin, isSystemAdmin as checkIsSystemAdmin} from 'mattermost-redux/utils/user_utils';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';

import {SidebarSectionTypes} from 'app/constants/view';

import List from './list';

const filterZeroUnreads = memoizeResult((sections) => {
    return sections.filter((s) => {
        if (s.type === SidebarSectionTypes.UNREADS) {
            return s.items.length > 0;
        }
        return true;
    });
});

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
    const currentTeamId = getCurrentTeamId(state);
    const isAdmin = checkIsAdmin(roles);
    const isSystemAdmin = checkIsSystemAdmin(roles);
    const sidebarPrefs = getSidebarPreferences(state);
    const unreadChannelIds = getSortedUnreadChannelIds(state, null);
    const favoriteChannelIds = getFavoriteChannelIds(state);
    const orderedChannelIds = filterZeroUnreads(getOrderedChannelIds(
        state,
        null,
        sidebarPrefs.grouping,
        sidebarPrefs.sorting,
        sidebarPrefs.unreads_at_top === 'true',
        sidebarPrefs.favorite_at_top === 'true',
    ));

    return {
        canCreatePrivateChannels: showCreateOption(
            state,
            config,
            license,
            currentTeamId,
            General.PRIVATE_CHANNEL,
            isAdmin,
            isSystemAdmin
        ),
        favoriteChannelIds,
        theme: getTheme(state),
        unreadChannelIds,
        orderedChannelIds,
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

export default connect(mapStateToProps, null, null, {pure: true, areStatesEqual})(List);
