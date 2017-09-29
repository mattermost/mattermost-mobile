// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';

import TeamsListItem from './teams_list_item.js';

function mapStateToProps(state, ownProps) {
    return {
        teamMember: getTeamMemberships(state)[ownProps.team.id],
        ...ownProps
    };
}

export default connect(mapStateToProps)(TeamsListItem);
