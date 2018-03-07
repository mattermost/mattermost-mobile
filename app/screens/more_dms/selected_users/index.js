// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getUsers} from 'mattermost-redux/selectors/entities/users';

import SelectedUsers from './selected_users';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
        profiles: getUsers(state),
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
    };
}

export default connect(mapStateToProps)(SelectedUsers);
