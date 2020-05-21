// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {logout, loadMe} from 'app/actions/views/user';
import {connection} from 'app/actions/device';
import {selectDefaultTeam} from 'app/actions/views/select_team';

import ErrorTeamsList from './error_teams_list.js';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
    }
}
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

export default connect(mapStateToProps, mapDispatchToProps)(ErrorTeamsList);
