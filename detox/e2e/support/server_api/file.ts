// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import FormData from 'form-data';

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Files
// See https://api.mattermost.com/#tag/files
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Upload a file to a channel via the Mattermost files API.
 * The returned file ID can be attached to a post via the file_ids field.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - the channel to associate the file with
 * @param {string} fileName - the filename to use
 * @param {Buffer|string} fileContent - the file content
 * @return {Object} returns {fileId} on success or {error, status} on error
 */
export const apiUploadFileToChannel = async (
    baseUrl: string,
    channelId: string,
    fileName: string,
    fileContent: Buffer | string,
): Promise<any> => {
    const formData = new FormData();
    formData.append('files', Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent), {filename: fileName});
    formData.append('channel_id', channelId);

    try {
        const response = await client.request({
            url: `${baseUrl}/api/v4/files`,
            method: 'POST',
            data: formData,
            headers: formData.getHeaders(),
        });

        const fileId = response.data?.file_infos?.[0]?.id;
        if (!fileId) {
            return {error: {message: 'No file_id returned from upload'}};
        }
        return {fileId};
    } catch (err) {
        return getResponseFromError(err);
    }
};

export const File = {
    apiUploadFileToChannel,
};

export default File;
