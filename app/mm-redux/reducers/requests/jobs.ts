// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';
import {JobTypes} from '@mm-redux/action_types';

import {GenericAction} from '@mm-redux/types/actions';
import {JobsRequestsStatuses, RequestStatusType} from '@mm-redux/types/requests';

import {handleRequest, initialRequestState} from './helpers';

function createJob(state: RequestStatusType = initialRequestState(), action: GenericAction): RequestStatusType {
    return handleRequest(
        JobTypes.CREATE_JOB_REQUEST,
        JobTypes.CREATE_JOB_SUCCESS,
        JobTypes.CREATE_JOB_FAILURE,
        state,
        action,
    );
}

function getJob(state: RequestStatusType = initialRequestState(), action: GenericAction): RequestStatusType {
    return handleRequest(
        JobTypes.GET_JOB_REQUEST,
        JobTypes.GET_JOB_SUCCESS,
        JobTypes.GET_JOB_FAILURE,
        state,
        action,
    );
}

function getJobs(state: RequestStatusType = initialRequestState(), action: GenericAction): RequestStatusType {
    return handleRequest(
        JobTypes.GET_JOBS_REQUEST,
        JobTypes.GET_JOBS_SUCCESS,
        JobTypes.GET_JOBS_FAILURE,
        state,
        action,
    );
}

function cancelJob(state: RequestStatusType = initialRequestState(), action: GenericAction): RequestStatusType {
    return handleRequest(
        JobTypes.CANCEL_JOB_REQUEST,
        JobTypes.CANCEL_JOB_SUCCESS,
        JobTypes.CANCEL_JOB_FAILURE,
        state,
        action,
    );
}

export default (combineReducers({
    createJob,
    getJob,
    getJobs,
    cancelJob,
}) as (b: JobsRequestsStatuses, a: GenericAction) => JobsRequestsStatuses);
