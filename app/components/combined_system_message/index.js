// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {createSelector} from 'reselect';

import {getProfilesByIds, getProfilesByUsernames} from 'mattermost-redux/actions/users';
import {Preferences} from 'mattermost-redux/constants';
import {getBool, getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser, getProfiles} from 'mattermost-redux/selectors/entities/users';

import CombinedSystemMessage from './combined_system_message';

const getUserProfiles = createSelector(
    getProfiles,
    (state, props) => props.allUserIds,
    (state, props) => props.allUsernames,
    (profiles, allUserIds, allUsernames) => {
        const allProfiles = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            acc[profile.username] = profile;
            return acc;
        }, {});

        const userProfiles = [];

        if (allUserIds.length > 0) {
            const profilesById = allUserIds.
                filter((userId) => allProfiles[userId]).
                map((userId) => allProfiles[userId]);

            if (profilesById && profilesById.length > 0) {
                userProfiles.push(...profilesById);
            }
        }

        if (allUsernames.length > 0) {
            const profilesByUsername = allUsernames.
                filter((username) => allProfiles[username]).
                map((username) => allProfiles[username]);

            if (profilesByUsername && profilesByUsername.length > 0) {
                userProfiles.push(...profilesByUsername);
            }
        }

        return userProfiles;
    }
);

function mapStateToProps(state, ownProps) {
    const currentUser = getCurrentUser(state);
    const {allUserIds, allUsernames} = ownProps;
    return {
        currentUserId: currentUser.id,
        currentUsername: currentUser.username,
        showJoinLeave: getBool(state, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE, true),
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        userProfiles: getUserProfiles(state, {allUserIds, allUsernames}),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesByIds,
            getProfilesByUsernames,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(CombinedSystemMessage);
