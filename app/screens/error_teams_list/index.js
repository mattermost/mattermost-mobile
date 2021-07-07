// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connection} from 'app/actions/device';
import {selectDefaultTeam} from 'app/actions/views/select_team';
import {logout, loadMe} from 'app/actions/views/user';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import ErrorTeamsList from './error_teams_list.js';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            logout,
            selectDefaultTeam,
            connection,
            loadMe,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(ErrorTeamsList);
