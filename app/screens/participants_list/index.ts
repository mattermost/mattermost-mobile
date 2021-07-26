// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId, makeGetProfilesByIds} from '@mm-redux/selectors/entities/users';

import ParticipantsList from './participants_list';

import type {GlobalState} from '@mm-redux/types/store';
import type {UserProfile} from '@mm-redux/types/users';

interface ListProps {
    userIds: string[];
}

const EMPTY_USER_PROFILES: UserProfile[] = [];

function makeMapStateToProps() {
    const getProfilesByIds = makeGetProfilesByIds();

    return function mapStateToProps(state: GlobalState, ownProps:ListProps) {
        const allUserIds = ownProps.userIds;
        return {
            currentUserId: getCurrentUserId(state),
            theme: getTheme(state),
            teammateNameDisplay: getTeammateNameDisplaySetting(state),
            userProfiles: getProfilesByIds(state, allUserIds) || EMPTY_USER_PROFILES,
        };
    };
}

export default connect(makeMapStateToProps)(ParticipantsList);
