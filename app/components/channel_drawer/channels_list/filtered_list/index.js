// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {searchChannels} from 'mattermost-redux/actions/channels';
import {searchProfiles} from 'mattermost-redux/actions/users';
import {makeGroupMessageVisibleIfNecessary} from 'mattermost-redux/actions/preferences';
import {General} from 'mattermost-redux/constants';
import {getGroupChannels, getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getProfilesInCurrentTeam, getUsers, getUserStatuses} from 'mattermost-redux/selectors/entities/users';
import {getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';

import FilteredList from './filtered_list';

function mapStateToProps(state, ownProps) {
    const {currentUserId} = state.entities.users;

    let profiles;
    if (getConfig(state).RestrictDirectMessage === General.RESTRICT_DIRECT_MESSAGE_ANY) {
        profiles = getUsers(state);
    } else {
        profiles = getProfilesInCurrentTeam(state);
    }

    return {
        currentUserId,
        otherChannels: getOtherChannels(state),
        groupChannels: getGroupChannels(state),
        profiles,
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        statuses: getUserStatuses(state),
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
