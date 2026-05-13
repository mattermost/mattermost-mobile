// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs';

import {AxiosRequestConfig} from 'axios';
import FormData from 'form-data';

import client from './client';

export const getCookiesFromConfig = (config: AxiosRequestConfig<any>) => {
    let mmAuthToken = '';
    let mmUserId = '';
    let mmCsrf = '';
    config.jar?.toJSON()?.cookies.forEach((cookie: any) => {
        if (cookie.key === 'MMAUTHTOKEN') {
            mmAuthToken = cookie.value;
        } else if (cookie.key === 'MMUSERID') {
            mmUserId = cookie.value;
        } else if (cookie.key === 'MMCSRF') {
            mmCsrf = cookie.value;
        }
    });

    return {
        mmAuthToken,
        mmUserId,
        mmCsrf,
    };
};

export const getResponseFromError = (err: any) => {
    const {response} = err;
    if (!response) {
        // Network-level error (ECONNREFUSED, ETIMEDOUT, etc.) — no HTTP response.
        // Return a structured error object instead of throwing so callers can
        // inspect result.error without an unhandled exception breaking the hook chain.
        const message = `No response from server: ${err?.message || String(err)}. ` +
            'If testing against a non-default server, set the SITE_URL environment variable.';
        console.warn(`[getResponseFromError] Network error: ${message}`); // eslint-disable-line no-console
        return {error: {message}, status: 0};
    }

    const {data, status} = response;

    // Explicitly print out response data from server for ease of debugging
    console.warn(data); // eslint-disable-line no-console

    return {error: data, status};
};

export const apiUploadFile = async (name: string, absFilePath: string, requestOptions = {}): Promise<any> => {
    if (!fs.existsSync(absFilePath)) {
        return {error: {message: `File upload error. "${name}" file does not exist at ${absFilePath}`}};
    }

    const formData = new FormData();
    formData.append(name, fs.createReadStream(absFilePath));

    try {
        return await client.request({
            ...requestOptions,
            data: formData,
            headers: formData.getHeaders(),
        });
    } catch (err) {
        return getResponseFromError(err);
    }
};
