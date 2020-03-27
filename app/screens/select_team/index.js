// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTeams, addUserToTeam, joinTeam} from '@mm-redux/actions/teams';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getJoinableTeams} from '@mm-redux/selectors/entities/teams';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';

import {logout} from 'app/actions/views/user';
import {handleTeamChange} from 'app/actions/views/select_team';
import {isLandscape} from 'app/selectors/device';
import {isGuest} from 'app/utils/users';

import SelectTeam from './select_team.js';

function mapStateToProps(state) {
    const currentUser = getCurrentUser(state);
    const currentUserIsGuest = isGuest(currentUser);

    return {
        currentUserId: currentUser && currentUser.id,
        currentUserIsGuest,
        isLandscape: isLandscape(state),
        serverVersion: state.entities.general.serverVersion,
        teamsRequest: state.requests.teams.getTeams,
        teams: getJoinableTeams(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeams,
            handleTeamChange,
            joinTeam,
            addUserToTeam,
            logout,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(SelectTeam);
