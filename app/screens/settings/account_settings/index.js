// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {updateUser, handleUploadProfileImage} from 'app/actions/views/account_settings';

import AccountSettings from './account_settings';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {RequestStatus} from 'mattermost-redux/constants';
import {getDimensions} from 'app/selectors/device';

// TODO: may not be the best solution, the idea is to merge request results from
// updateUser and handleUploadProfileImage actions
function mergeRequest(updateMeRequest, updateProfilePictureRequest) {
    let updateRequest = {};
    const updateMeStatus = updateMeRequest.status;
    const updateProfilePictureStatus = updateProfilePictureRequest.status;

    let updateErrors = null;
    const updateMeFailure = updateMeStatus === RequestStatus.FAILURE;
    const updateProfilePictureFailure = updateProfilePictureStatus === RequestStatus.FAILURE;

    if (updateProfilePictureFailure) {
        updateErrors = updateProfilePictureRequest;
    }

    if (updateMeFailure) {
        const updateProfilePictureError = updateErrors && updateErrors.error &&
            (updateErrors.error.message || updateErrors.error);
        const updateMeError = updateMeRequest && updateMeRequest.error &&
            (updateMeRequest.error.message || updateMeRequest.error);
        updateErrors = updateErrors ?
            {
                ...updateErrors,
                error: `${updateProfilePictureError}\n${updateMeError}`
            } : updateMeRequest;
        updateRequest = updateErrors;
    }

    if (updateMeFailure || updateProfilePictureFailure) {
        return updateRequest;
    }

    if (updateMeStatus === RequestStatus.STARTED || updateProfilePictureStatus === RequestStatus.STARTED) {
        return {status: RequestStatus.STARTED};
    }

    if ((updateMeStatus === RequestStatus.SUCCESS && updateProfilePictureStatus === RequestStatus.NOT_STARTED) ||
        (updateProfilePictureStatus === RequestStatus.SUCCESS && updateMeStatus === RequestStatus.NOT_STARTED) ||
        (updateMeStatus === RequestStatus.SUCCESS && updateProfilePictureStatus === RequestStatus.SUCCESS)) {
        updateRequest = {status: RequestStatus.SUCCESS};
    }

    return updateRequest;
}

function mapStateToProps(state) {
    const {deviceWidth, deviceHeight} = getDimensions(state);
    const {updateMe: updateMeRequest, updateUser: updateProfilePictureRequest} = state.requests.users;

    const updateRequest = mergeRequest(updateMeRequest, updateProfilePictureRequest);

    return {
        currentUser: getCurrentUser(state),
        config: getConfig(state),
        theme: getTheme(state),
        deviceWidth,
        deviceHeight,
        updateRequest
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleUploadProfileImage,
            updateUser
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AccountSettings);
