// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getStatusForUserId} from 'mattermost-redux/selectors/entities/users';

import StatusLabel from './status_label';

function mapStateToProps(state, ownProps) {
    return {
        status: getStatusForUserId(state, ownProps.userId),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(StatusLabel);
