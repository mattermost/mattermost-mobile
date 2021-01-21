// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ParticipantsList from './participants_list';
import type {GlobalState} from '@mm-redux/types/store';
import {connect} from 'react-redux';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {makeGetProfilesByIdsAndUsernames} from '@mm-redux/selectors/entities/users';

interface ListProps {
    userIds: string[];
}

function makeMapStateToProps() {
    const getProfilesByIdsAndUsernames = makeGetProfilesByIdsAndUsernames();

    return function mapStateToProps(state: GlobalState, ownProps:ListProps) {
        const allUserIds = ownProps.userIds;
        return {
            theme: getTheme(state),
            userProfiles: getProfilesByIdsAndUsernames(state, {allUserIds, allUsernames: []}) || [],
        };
    };
}

export default connect(makeMapStateToProps)(ParticipantsList);
