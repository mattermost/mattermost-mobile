// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'service/selectors/entities/preferences';
import {getStatusesByIdsBatchedDebounced} from 'service/actions/users';
import {getStatusForUserId} from 'service/selectors/entities/users';

import ProfilePicture from './profile_picture';

function mapStateToProps(state, ownProps) {
    let status = ownProps.status;
    if (!status && ownProps.user) {
        status = ownProps.user.status || getStatusForUserId(state, ownProps.user.id);
    }

    return {
        theme: ownProps.theme || getTheme(state),
        status,
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getStatusForId: getStatusesByIdsBatchedDebounced
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfilePicture);
