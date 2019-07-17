// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {logout, loadMe} from 'mattermost-redux/actions/users';
import {connection} from 'app/actions/device';
import {selectDefaultTeam} from 'app/actions/views/select_team';

import {resetToChannel} from 'app/actions/navigation';

import ErrorTeamsList from './error_teams_list.js';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            logout,
            selectDefaultTeam,
            connection,
            loadMe,
            resetToChannel,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(ErrorTeamsList);
