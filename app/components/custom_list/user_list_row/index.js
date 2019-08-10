// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getUser} from 'mattermost-redux/selectors/entities/users';
import {isLandscape} from 'app/selectors/device';
import UserListRow from './user_list_row';

function mapStateToProps(state, ownProps) {
    return {
        isMyUser: getCurrentUserId(state) === ownProps.id,
        theme: getTheme(state),
        user: getUser(state, ownProps.id),
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        isLandscape: isLandscape(state),
    };
}

export default connect(mapStateToProps)(UserListRow);
