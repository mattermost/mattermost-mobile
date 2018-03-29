// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTeam} from 'mattermost-redux/selectors/entities/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import TeamIcon from './team_icon';

function mapStateToProps(state, ownProps) {
    return {
        team: getTeam(state, ownProps.teamId),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(TeamIcon);
