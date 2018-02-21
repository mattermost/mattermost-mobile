// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getStatusesByIdsBatchedDebounced} from 'mattermost-redux/actions/users';
import {getStatusForUserId, getUser} from 'mattermost-redux/selectors/entities/users';

import ProfilePicture from './profile_picture';

function mapStateToProps(state, ownProps) {
    let status = ownProps.status;
    const user = getUser(state, ownProps.userId);
    if (!status && ownProps.userId) {
        status = getStatusForUserId(state, ownProps.userId);
    }

    return {
        theme: getTheme(state),
        status,
        user,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getStatusForId: getStatusesByIdsBatchedDebounced,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfilePicture);
