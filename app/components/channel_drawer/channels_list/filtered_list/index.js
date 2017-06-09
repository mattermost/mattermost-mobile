// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {searchChannels} from 'mattermost-redux/actions/channels';
import {searchProfiles} from 'mattermost-redux/actions/users';
import {makeGroupMessageVisibleIfNecessary} from 'mattermost-redux/actions/preferences';
import {getUserIdsInChannels, getUsers, getUserStatuses} from 'mattermost-redux/selectors/entities/users';
import {getGroupChannels, getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';

import {setChannelDisplayName} from 'app/actions/views/channel';

import FilteredList from './filtered_list';

function mapStateToProps(state, ownProps) {
    const {currentUserId} = state.entities.users;

    return {
        currentUserId,
        otherChannels: getOtherChannels(state),
        groupChannels: getGroupChannels(state),
        profiles: getUsers(state),
        profilesInChannel: getUserIdsInChannels(state),
        myPreferences: getMyPreferences(state),
        statuses: getUserStatuses(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            makeGroupMessageVisibleIfNecessary,
            searchChannels,
            searchProfiles,
            setChannelDisplayName
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(FilteredList);
