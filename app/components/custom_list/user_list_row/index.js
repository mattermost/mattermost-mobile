// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getUser} from 'mattermost-redux/selectors/entities/users';

import UserListRow from './user_list_row';

function mapStateToProps(state, ownProps) {
    return {
        isMyUser: getCurrentUserId(state) === ownProps.id,
        theme: getTheme(state),
        user: getUser(state, ownProps.id),
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
    };
}

export default connect(mapStateToProps)(UserListRow);
