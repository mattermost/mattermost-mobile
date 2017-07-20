// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import {getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';
import {getUser} from 'mattermost-redux/selectors/entities/users';

import UserListRow from './user_list_row';

function mapStateToProps(state, ownProps) {
    return {
        theme: getTheme(state),
        user: getUser(state, ownProps.id),
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        ...ownProps
    };
}

export default connect(mapStateToProps)(UserListRow);
