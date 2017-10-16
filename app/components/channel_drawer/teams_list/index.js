// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getCurrentTeamId, getJoinableTeamIds, getMySortedTeamIds} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {handleTeamChange} from 'app/actions/views/select_team';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {removeProtocol} from 'app/utils/url';

import TeamsList from './teams_list';

function mapStateToProps(state) {
    const currentUser = getCurrentUser(state);
    const locale = currentUser ? currentUser.locale : 'en';

    return {
        canJoinOtherTeams: getJoinableTeamIds(state).length > 0,
        currentTeamId: getCurrentTeamId(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        teamIds: getMySortedTeamIds(state, locale),
        theme: getTheme(state)
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
