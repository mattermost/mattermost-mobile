// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DOWNLOAD_TIMEOUT} from '@constants/network';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type {ClientResponse, ClientResponseError} from '@mattermost/react-native-network-client';

export const downloadFile = (serverUrl: string, fileId: string, desitnation: string) => { // Let it throw and handle it accordingly
    const client = NetworkManager.getClient(serverUrl);
    return client.apiClient.download(client.getFileRoute(fileId), desitnation.replace('file://', ''), {timeoutInterval: DOWNLOAD_TIMEOUT});
};

export const downloadProfileImage = (serverUrl: string, userId: string, lastPictureUpdate: number, destination: string) => { // Let it throw and handle it accordingly
    const client = NetworkManager.getClient(serverUrl);
    return client.apiClient.download(client.getProfilePictureUrl(userId, lastPictureUpdate), destination.replace('file://', ''), {timeoutInterval: DOWNLOAD_TIMEOUT});
};

export const uploadFile = (
    serverUrl: string,
    file: FileInfo,
    channelId: string,
    onProgress: (fractionCompleted: number, bytesRead?: number | null | undefined) => void = () => {/*Do Nothing*/},
    onComplete: (response: ClientResponse) => void = () => {/*Do Nothing*/},
    onError: (response: ClientResponseError) => void = () => {/*Do Nothing*/},
    skipBytes = 0,
) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return {cancel: client.uploadPostAttachment(file, channelId, onProgress, onComplete, onError, skipBytes)};
    } catch (error) {
        logDebug('error on uploadFile', getFullErrorMessage(error));
        return {error};
    }
};

export const fetchPublicLink = async (serverUrl: string, fileId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const publicLink = await client!.getFilePublicLink(fileId);
        return publicLink;
    } catch (error) {
        logDebug('error on fetchPublicLink', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const buildFileUrl = (serverUrl: string, fileId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getFileUrl(fileId, timestamp);
};

export const buildAbsoluteUrl = (serverUrl: string, relativePath: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getAbsoluteUrl(relativePath);
};

export const buildFilePreviewUrl = (serverUrl: string, fileId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getFilePreviewUrl(fileId, timestamp);
};

export const buildFileThumbnailUrl = (serverUrl: string, fileId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getFileThumbnailUrl(fileId, timestamp);
};
