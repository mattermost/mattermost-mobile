// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {createSelector} from 'reselect';

import {getMissingProfilesByIds, getMissingProfilesByUsernames} from 'mattermost-redux/actions/users';
import {Preferences} from 'mattermost-redux/constants';
import {getBool, getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser, getProfiles, getUsersByUsername} from 'mattermost-redux/selectors/entities/users';

import CombinedSystemMessage from './combined_system_message';

function makeGetUserProfiles() {
    return createSelector(
        getProfiles,
        getUsersByUsername,
        (state, props) => props.allUserIds,
        (state, props) => props.allUsernames,
        (allProfilesById, allProfilesByUsername, allUserIds, allUsernames) => {
            const userProfiles = [];

            if (allUserIds.length > 0) {
                const profilesById = allUserIds.
                    filter((userId) => allProfilesById[userId]).
                    map((userId) => allProfilesById[userId]);

                if (profilesById && profilesById.length > 0) {
                    userProfiles.push(...profilesById);
                }
            }

            if (allUsernames.length > 0) {
                const profilesByUsername = allUsernames.
                    filter((username) => allProfilesByUsername[username]).
                    map((username) => allProfilesByUsername[username]);

                if (profilesByUsername && profilesByUsername.length > 0) {
                    userProfiles.push(...profilesByUsername);
                }
            }

            return userProfiles;
        }
    );
}

function makeMapStateToProps() {
    const getUserProfiles = makeGetUserProfiles();

    return (state, ownProps) => {
        const currentUser = getCurrentUser(state);
        const {allUserIds, allUsernames} = ownProps;
        return {
            currentUserId: currentUser.id,
            currentUsername: currentUser.username,
            showJoinLeave: getBool(state, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE, true),
            teammateNameDisplay: getTeammateNameDisplaySetting(state),
            userProfiles: getUserProfiles(state, {allUserIds, allUsernames}),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getMissingProfilesByIds,
            getMissingProfilesByUsernames,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(CombinedSystemMessage);
