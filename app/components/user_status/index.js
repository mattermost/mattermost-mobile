// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getStatusForUserId} from 'mattermost-redux/selectors/entities/users';

import UserStatus from './user_status';

function mapStateToProps(state, ownProps) {
    let status = ownProps.status;
    if (!status && ownProps.userId) {
        status = getStatusForUserId(state, ownProps.userId);
    }

    return {
        status,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(UserStatus);
