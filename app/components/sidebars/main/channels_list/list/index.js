// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {
    getSortedFavoriteChannelIds,
    getSortedUnreadChannelIds,
    getOrderedChannelIds,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getTheme, getFavoritesPreferences, getSidebarPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {memoizeResult} from 'mattermost-redux/utils/helpers';
import {isAdmin as checkIsAdmin, isSystemAdmin as checkIsSystemAdmin} from 'mattermost-redux/utils/user_utils';
import {getConfig, getLicense, hasNewPermissions} from 'mattermost-redux/selectors/entities/general';
import {haveITeamPermission} from 'mattermost-redux/selectors/entities/roles';
import Permissions from 'mattermost-redux/constants/permissions';

import {showModal} from 'app/actions/navigation';
import {isLandscape} from 'app/selectors/device';
import {DeviceTypes, ViewTypes} from 'app/constants';

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
    const config = getConfig(state);
    const license = getLicense(state);
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
    const currentTeamId = getCurrentTeamId(state);
    const isAdmin = checkIsAdmin(roles);
    const isSystemAdmin = checkIsSystemAdmin(roles);
    const sidebarPrefs = getSidebarPreferences(state);
    const lastUnreadChannel = DeviceTypes.IS_TABLET ? state.views.channel.keepChannelIdAsUnread : null;
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

    let canJoinPublicChannels = true;
    if (hasNewPermissions(state)) {
        canJoinPublicChannels = haveITeamPermission(state, {
            team: currentTeamId,
            permission: Permissions.JOIN_PUBLIC_CHANNELS,
        });
    }

    return {
        canJoinPublicChannels,
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
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            showModal,
        }, dispatch),
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

export default connect(mapStateToProps, mapDispatchToProps, null, {pure: true, areStatesEqual})(List);
