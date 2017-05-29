// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getCurrentTeamId, getMyTeams} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {handleTeamChange} from 'app/actions/views/select_team';
import {getTheme} from 'app/selectors/preferences';
import {removeProtocol} from 'app/utils/url';

import ChannelDrawerTeams from './channel_drawer_teams';

function mapStateToProps(state, ownProps) {
    const user = getCurrentUser(state);

    function sortTeams(locale, a, b) {
        if (a.display_name !== b.display_name) {
            return a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase(), locale, {numeric: true});
        }

        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
    }

    return {
        canCreateTeams: false,
        canJoinTeams: false,
        currentTeamId: getCurrentTeamId(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        teams: getMyTeams(state).sort(sortTeams.bind(null, (user.locale))),
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

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawerTeams);
