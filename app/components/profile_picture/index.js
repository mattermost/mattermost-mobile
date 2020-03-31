// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getStatusesByIdsBatchedDebounced} from '@mm-redux/actions/users';
import {getCurrentUserId, getStatusForUserId, getUser} from '@mm-redux/selectors/entities/users';

import {setProfileImageUri} from 'app/actions/views/edit_profile';
import {getProfileImageUri} from 'app/selectors/views';

import ProfilePicture from './profile_picture';

function mapStateToProps(state, ownProps) {
    let status = ownProps.status;
    const user = getUser(state, ownProps.userId);
    if (!status && ownProps.userId) {
        status = getStatusForUserId(state, ownProps.userId);
    }

    const isCurrentUser = getCurrentUserId(state) === ownProps.userId;
    let profileImageUri = '';
    if (isCurrentUser) {
        profileImageUri = getProfileImageUri(state);
    }

    return {
        isCurrentUser,
        theme: getTheme(state),
        profileImageUri,
        status,
        user,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            setProfileImageUri,
            getStatusForId: getStatusesByIdsBatchedDebounced,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfilePicture);
