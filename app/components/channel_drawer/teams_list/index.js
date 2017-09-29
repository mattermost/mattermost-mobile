// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getCurrentTeamId, getJoinableTeams} from 'mattermost-redux/selectors/entities/teams';

import {handleTeamChange} from 'app/actions/views/select_team';
import {getTheme} from 'app/selectors/preferences';
import {getMySortedTeams} from 'app/selectors/teams';
import {removeProtocol} from 'app/utils/url';

import TeamsList from './teams_list';

function mapStateToProps(state, ownProps) {
    return {
        canCreateTeams: false,
        joinableTeams: getJoinableTeams(state),
        currentTeamId: getCurrentTeamId(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        teams: getMySortedTeams(state),
        theme: getTheme(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleTeamChange
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TeamsList);
