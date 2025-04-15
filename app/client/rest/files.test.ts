// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientFilesMix} from './files';

let client: ClientFilesMix & ClientBase;

beforeAll(() => {
    client = TestHelper.createClient();
    client.doFetch = jest.fn();
    client.apiClient.upload = jest.fn();
});

test('getFileUrl', () => {
    const fileId = 'file_id';
    const timestamp = 123456;
    const expectedBaseUrl = `${client.apiClient.baseUrl}${client.getFileRoute(fileId)}`;
    const expectedUrl = `${expectedBaseUrl}?${timestamp}`;

    const result = client.getFileUrl(fileId, timestamp);

    expect(result).toBe(expectedUrl);

    // Test with zero timestamp
    const resultZero = client.getFileUrl(fileId, 0);
    expect(resultZero).toBe(expectedBaseUrl);
});

test('getFileThumbnailUrl', () => {
    const fileId = 'file_id';
    const timestamp = 123456;
    const expectedBaseUrl = `${client.apiClient.baseUrl}${client.getFileRoute(fileId)}/thumbnail`;
    const expectedUrl = `${expectedBaseUrl}?${timestamp}`;

    const result = client.getFileThumbnailUrl(fileId, timestamp);

    expect(result).toBe(expectedUrl);

    // Test with zero timestamp
    const resultZero = client.getFileThumbnailUrl(fileId, 0);
    expect(resultZero).toBe(expectedBaseUrl);
});

test('getFilePreviewUrl', () => {
    const fileId = 'file_id';
    const timestamp = 123456;
    const expectedBaseUrl = `${client.apiClient.baseUrl}${client.getFileRoute(fileId)}/preview`;
    const expectedUrl = `${expectedBaseUrl}?${timestamp}`;

    const result = client.getFilePreviewUrl(fileId, timestamp);

    expect(result).toBe(expectedUrl);

    // Test with zero timestamp
    const resultZero = client.getFilePreviewUrl(fileId, 0);
    expect(resultZero).toBe(expectedBaseUrl);
});

test('getFilePublicLink', async () => {
    const fileId = 'file_id';
    const expectedUrl = `${client.getFileRoute(fileId)}/link`;
    const expectedOptions = {method: 'get'};

    await client.getFilePublicLink(fileId);

    expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
});

test('uploadAttachment', () => {
    const file = {localPath: '/path/to/file'} as FileInfo;
    const channelId = 'channel_id';
    const onProgress = jest.fn();
    const onComplete = jest.fn();
    const onError = jest.fn();
    const skipBytes = 1;
    const isBookmark = true;
    const expectedUrl = `${client.getFilesRoute()}?bookmark=true`;
    const expectedOptions = {
        skipBytes,
        method: 'POST',
        multipart: {
            data: {
                channel_id: channelId,
            },
        },
        timeoutInterval: 180000,
    };

    (client.apiClient.upload as jest.Mock).mockReturnValue({
        progress: jest.fn().mockReturnThis(),
        then: jest.fn().mockReturnThis(),
        catch: jest.fn().mockReturnThis(),
        cancel: jest.fn(),
    });

    client.uploadAttachment(file, channelId, onProgress, onComplete, onError, skipBytes, isBookmark);

    expect(client.apiClient.upload).toHaveBeenCalledWith(expectedUrl, file.localPath, expectedOptions);

    // Test with default values
    const expectedDefaultOptions = {
        skipBytes: 0,
        method: 'POST',
        multipart: {
            data: {
                channel_id: channelId,
            },
        },
        timeoutInterval: 180000,
    };
    client.uploadAttachment(file, channelId, onProgress, onComplete, onError);
    expect(client.apiClient.upload).toHaveBeenCalledWith(client.getFilesRoute(), file.localPath, expectedDefaultOptions);
});

test('uploadAttachment throws error when file has no localPath', () => {
    const file = {} as FileInfo;
    const channelId = 'channel_id';

    expect(() => {
        client.uploadAttachment(
            file,
            channelId,
            jest.fn(),
            jest.fn(),
            jest.fn(),
        );
    }).toThrow('file does not have local path defined');
});

test('searchFilesWithParams', async () => {
    const teamId = 'team_id';
    const params = {terms: 'search terms', is_or_search: true};
    const expectedUrl = `${client.getTeamRoute(teamId)}/files/search`;
    const expectedOptions = {method: 'post', body: params};

    await client.searchFilesWithParams(teamId, params);

    expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
});

test('searchFilesWithParams without teamId', async () => {
    const params = {terms: 'search terms', is_or_search: true};
    const expectedUrl = `${client.getFilesRoute()}/search`;
    const expectedOptions = {method: 'post', body: params};

    await client.searchFilesWithParams('', params);

    expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
});

test('searchFiles', async () => {
    const teamId = 'team_id';
    const terms = 'search terms';
    const isOrSearch = true;
    const params = {terms, is_or_search: isOrSearch};
    const expectedUrl = `${client.getTeamRoute(teamId)}/files/search`;
    const expectedOptions = {method: 'post', body: params};

    await client.searchFiles(teamId, terms, isOrSearch);

    expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
});
