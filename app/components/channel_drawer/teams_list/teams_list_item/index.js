// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId, getTeam, makeGetBadgeCountForTeamId} from 'mattermost-redux/selectors/entities/teams';

import {removeProtocol} from 'app/utils/url';

import TeamsListItem from './teams_list_item.js';

function makeMapStateToProps() {
    const getMentionCount = makeGetBadgeCountForTeamId();

    return function mapStateToProps(state, ownProps) {
        const team = getTeam(state, ownProps.teamId);

        return {
            currentTeamId: getCurrentTeamId(state),
            currentUrl: removeProtocol(getCurrentUrl(state)),
            displayName: team.display_name,
            mentionCount: getMentionCount(state, ownProps.teamId),
            name: team.name,
            theme: getTheme(state),
        };
    };
}

export default connect(makeMapStateToProps)(TeamsListItem);
