// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {searchChannels} from 'mattermost-redux/actions/channels';
import {getProfilesInTeam, searchProfiles} from 'mattermost-redux/actions/users';
import {makeGroupMessageVisibleIfNecessary} from 'mattermost-redux/actions/preferences';
import {General} from 'mattermost-redux/constants';
import {getGroupChannels, getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getCurrentUserId, getProfilesInCurrentTeam, getUsers, getUserIdsInChannels, getUserStatuses} from 'mattermost-redux/selectors/entities/users';
import {getDirectShowPreferences, getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';

import Config from 'assets/config';

import FilteredList from './filtered_list';

const DEFAULT_SEARCH_ORDER = ['unreads', 'dms', 'channels', 'members', 'nonmembers'];

const pastDirectMessages = createSelector(
    getDirectShowPreferences,
    (directChannelsFromPreferences) => directChannelsFromPreferences.filter((d) => d.value === 'false').map((d) => d.name)
);

const getTeamProfiles = createSelector(
    getProfilesInCurrentTeam,
    (members) => {
        return members.reduce((memberProfiles, member) => {
            memberProfiles[member.id] = member;

            return memberProfiles;
        }, {});
    }
);

function getGroupDetails(currentUserId, userIdsInChannels, profiles, groupChannels) {
    return groupChannels.reduce((groupMemberDetails, channel) => {
        if (!userIdsInChannels.hasOwnProperty(channel.id)) {
            return groupMemberDetails;
        }

        const members = Array.from(userIdsInChannels[channel.id]).reduce((details, member) => {
            if (member === currentUserId) {
                return details;
            }

            const profile = profiles[member];
            const username = `${details.username || ''} ${profile.username}`;
            const email = `${details.email || ''} ${profile.email}`;
            const nickname = `${details.nickname || ''} ${profile.nickname}`;

            return {
                username: username.trim(),
                email: email.trim(),
                nickname: nickname.trim()
            };
        }, {});

        groupMemberDetails[channel.id] = members;

        return groupMemberDetails;
    }, {});
}

const getGroupChannelMemberDetails = createSelector(
    getCurrentUserId,
    getUserIdsInChannels,
    getUsers,
    getGroupChannels,
    getGroupDetails
);

function mapStateToProps(state, ownProps) {
    const {currentUserId} = state.entities.users;

    const profiles = getUsers(state);
    let teamProfiles = {};
    const restrictDms = getConfig(state).RestrictDirectMessage !== General.RESTRICT_DIRECT_MESSAGE_ANY;
    if (restrictDms) {
        teamProfiles = getTeamProfiles(state);
    }

    const searchOrder = Config.DrawerSearchOrder ? Config.DrawerSearchOrder : DEFAULT_SEARCH_ORDER;

    return {
        currentUserId,
        otherChannels: getOtherChannels(state),
        groupChannels: getGroupChannels(state),
        groupChannelMemberDetails: getGroupChannelMemberDetails(state),
        profiles,
        teamProfiles,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        statuses: getUserStatuses(state),
        searchOrder,
        pastDirectMessages: pastDirectMessages(state),
        restrictDms,
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesInTeam,
            makeGroupMessageVisibleIfNecessary,
            searchChannels,
            searchProfiles
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FilteredList);
