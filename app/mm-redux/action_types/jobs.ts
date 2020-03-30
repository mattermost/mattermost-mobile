// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import keyMirror from '@mm-redux/utils/key_mirror';

export default keyMirror({
    CREATE_JOB_REQUEST: null,
    CREATE_JOB_SUCCESS: null,
    CREATE_JOB_FAILURE: null,

    CANCEL_JOB_REQUEST: null,
    CANCEL_JOB_SUCCESS: null,
    CANCEL_JOB_FAILURE: null,

    GET_JOB_REQUEST: null,
    GET_JOB_SUCCESS: null,
    GET_JOB_FAILURE: null,

    GET_JOBS_REQUEST: null,
    GET_JOBS_SUCCESS: null,
    GET_JOBS_FAILURE: null,

    RECEIVED_JOB: null,
    RECEIVED_JOBS: null,
    RECEIVED_JOBS_BY_TYPE: null,
});
