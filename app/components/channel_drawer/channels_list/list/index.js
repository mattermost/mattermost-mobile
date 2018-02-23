// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {
    getSortedUnreadChannelIds,
    getSortedFavoriteChannelIds,
    getSortedPublicChannelIds,
    getSortedPrivateChannelIds,
    getSortedDirectChannelIds,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getTheme, getFavoritesPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import List from './list';

function mapStateToProps(state) {
    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
    const unreadChannelIds = getSortedUnreadChannelIds(state);
    const favoriteChannelIds = getSortedFavoriteChannelIds(state);
    const publicChannelIds = getSortedPublicChannelIds(state);
    const privateChannelIds = getSortedPrivateChannelIds(state);
    const directChannelIds = getSortedDirectChannelIds(state);

    return {
        canCreatePrivateChannels: showCreateOption(config, license, General.PRIVATE_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        unreadChannelIds,
        favoriteChannelIds,
        publicChannelIds,
        privateChannelIds,
        directChannelIds,
        theme: getTheme(state),
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
