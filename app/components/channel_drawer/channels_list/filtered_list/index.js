// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {searchChannels} from 'mattermost-redux/actions/channels';
import {searchProfiles} from 'mattermost-redux/actions/users';
import {makeGroupMessageVisibleIfNecessary} from 'mattermost-redux/actions/preferences';
import {General} from 'mattermost-redux/constants';
import {getGroupChannels, getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getProfilesInCurrentTeam, getUsers, getUserStatuses} from 'mattermost-redux/selectors/entities/users';
import {getDirectShowPreferences, getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';

import Config from 'assets/config';

import FilteredList from './filtered_list';

const DEFAULT_SEARCH_ORDER = ['unreads', 'dms', 'channels', 'members', 'nonmembers'];

const pastDirectMessages = createSelector(
    getDirectShowPreferences,
    (directChannelsFromPreferences) => directChannelsFromPreferences.filter((d) => d.value === 'false').map((d) => d.name)
);

function mapStateToProps(state, ownProps) {
    const {currentUserId} = state.entities.users;

    let profiles;
    if (getConfig(state).RestrictDirectMessage === General.RESTRICT_DIRECT_MESSAGE_ANY) {
        profiles = getUsers(state);
    } else {
        profiles = getProfilesInCurrentTeam(state);
    }

    const searchOrder = Config.SidebarSearchOrder ? Config.SidebarSearchOrder : DEFAULT_SEARCH_ORDER;

    return {
        currentUserId,
        otherChannels: getOtherChannels(state),
        groupChannels: getGroupChannels(state),
        profiles,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        statuses: getUserStatuses(state),
        searchOrder,
        pastDirectMessages: pastDirectMessages(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            makeGroupMessageVisibleIfNecessary,
            searchChannels,
            searchProfiles
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FilteredList);
