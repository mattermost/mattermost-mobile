// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import FormData from 'form-data';
import fs from 'fs';

import client from './client';

export const getResponseFromError = (err) => {
    const {response: {data, status}} = err;

    return {error: data, status};
};

export const apiUploadFile = async (name, absFilePath, requestOptions = {}) => {
    const formData = new FormData();
    formData.append(name, fs.createReadStream(absFilePath));

    try {
        const response = await client.request({
            ...requestOptions,
            data: formData,
            headers: formData.getHeaders(),
        });

        return response;
    } catch (err) {
        return getResponseFromError(err);
    }
};
