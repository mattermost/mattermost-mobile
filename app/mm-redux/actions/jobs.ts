// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {JobTypes} from '@mm-redux/action_types';
import {Client4} from '@mm-redux/client';
import {General} from '../constants';

import {ActionFunc} from '@mm-redux/types/actions';
import {JobType, Job} from '@mm-redux/types/jobs';

import {bindClientFunc} from './helpers';
export function createJob(job: Job): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.createJob,
        onRequest: JobTypes.CREATE_JOB_REQUEST,
        onSuccess: [JobTypes.RECEIVED_JOB, JobTypes.CREATE_JOB_SUCCESS],
        onFailure: JobTypes.CREATE_JOB_FAILURE,
        params: [
            job,
        ],
    });
}

export function getJob(id: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getJob,
        onRequest: JobTypes.GET_JOB_REQUEST,
        onSuccess: [JobTypes.RECEIVED_JOB, JobTypes.GET_JOB_SUCCESS],
        onFailure: JobTypes.GET_JOB_FAILURE,
        params: [
            id,
        ],
    });
}

export function getJobs(page = 0, perPage: number = General.JOBS_CHUNK_SIZE): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getJobs,
        onRequest: JobTypes.GET_JOBS_REQUEST,
        onSuccess: [JobTypes.RECEIVED_JOBS, JobTypes.GET_JOBS_SUCCESS],
        onFailure: JobTypes.GET_JOBS_FAILURE,
        params: [
            page,
            perPage,
        ],
    });
}

export function getJobsByType(type: JobType, page = 0, perPage: number = General.JOBS_CHUNK_SIZE): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getJobsByType,
        onRequest: JobTypes.GET_JOBS_REQUEST,
        onSuccess: [JobTypes.RECEIVED_JOBS, JobTypes.RECEIVED_JOBS_BY_TYPE, JobTypes.GET_JOBS_SUCCESS],
        onFailure: JobTypes.GET_JOBS_FAILURE,
        params: [
            type,
            page,
            perPage,
        ],
    });
}

export function cancelJob(job: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.cancelJob,
        onRequest: JobTypes.CANCEL_JOB_REQUEST,
        onSuccess: JobTypes.CANCEL_JOB_SUCCESS,
        onFailure: JobTypes.CANCEL_JOB_FAILURE,
        params: [
            job,
        ],
    });
}
