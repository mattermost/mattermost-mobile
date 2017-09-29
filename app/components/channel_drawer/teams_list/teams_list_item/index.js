// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';

import {removeProtocol} from 'app/utils/url';

import TeamsListItem from './teams_list_item.js';

function mapStateToProps(state, ownProps) {
    return {
        currentTeamId: getCurrentTeamId(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        teamMember: getTeamMemberships(state)[ownProps.team.id],
        theme: getTheme(state),
        ...ownProps
    };
}

export default connect(mapStateToProps)(TeamsListItem);
