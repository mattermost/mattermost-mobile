// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentTeamId, getMySortedTeamIds, getJoinableTeamIds} from 'mattermost-redux/selectors/entities/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {showModal} from 'app/actions/navigation';
import {handleTeamChange} from 'app/actions/views/select_team';
import {getCurrentLocale} from 'app/selectors/i18n';

import TeamsList from './teams_list';

function mapStateToProps(state) {
    const locale = getCurrentLocale(state);

    return {
        currentTeamId: getCurrentTeamId(state),
        hasOtherJoinableTeams: getJoinableTeamIds(state).length > 0,
        teamIds: getMySortedTeamIds(state, locale),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleTeamChange,
            showModal,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TeamsList);
