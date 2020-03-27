// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {connect} from 'react-redux';

import {getTeam} from '@mm-redux/selectors/entities/teams';

import TeamItem from './team_item';

function mapStateToProps(state, ownProps) {
    return {
        team: getTeam(state, ownProps.teamId),
    };
}

export default connect(mapStateToProps)(TeamItem);
