// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getCurrentTeamId, getMySortedTeamIds} from 'mattermost-redux/selectors/entities/teams';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {handleTeamChange} from 'app/actions/views/select_team';
import {getCurrentLocale} from 'app/selectors/i18n';
import {removeProtocol} from 'app/utils/url';

import TeamsList from './teams_list';

function mapStateToProps(state) {
    const locale = getCurrentLocale(state);

    return {
        currentTeamId: getCurrentTeamId(state),
        currentUrl: removeProtocol(getCurrentUrl(state)),
        teamIds: getMySortedTeamIds(state, locale),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleTeamChange,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(TeamsList);
