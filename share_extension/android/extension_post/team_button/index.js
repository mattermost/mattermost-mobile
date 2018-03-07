// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTeam} from 'mattermost-redux/selectors/entities/teams';

import TeamButton from './team_button';

function mapStateToProps(state, ownProps) {
    return {
        team: getTeam(state, ownProps.teamId),
    };
}

export default connect(mapStateToProps)(TeamButton);
