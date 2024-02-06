// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

import type ClientBase from './base';
import type {ClientResponse, ClientResponseError, ProgressPromise, UploadRequestOptions} from '@mattermost/react-native-network-client';

export interface ClientFilesMix {
    getFileUrl: (fileId: string, timestamp: number) => string;
    getFileThumbnailUrl: (fileId: string, timestamp: number) => string;
    getFilePreviewUrl: (fileId: string, timestamp: number) => string;
    getFilePublicLink: (fileId: string) => Promise<{link: string}>;
    uploadPostAttachment: (
        file: FileInfo,
        channelId: string,
        onProgress: (fractionCompleted: number, bytesRead?: number | null | undefined) => void,
        onComplete: (response: ClientResponse) => void,
        onError: (response: ClientResponseError) => void,
        skipBytes?: number,
    ) => () => void;
    searchFiles: (teamId: string, terms: string) => Promise<FileSearchRequest>;
    searchFilesWithParams: (teamId: string, FileSearchParams: string) => Promise<FileSearchRequest>;
}

const ClientFiles = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getFileUrl(fileId: string, timestamp: number) {
        let url = `${this.apiClient.baseUrl}${this.getFileRoute(fileId)}`;
        if (timestamp) {
            url += `?${timestamp}`;
        }

        return url;
    }

    getFileThumbnailUrl(fileId: string, timestamp: number) {
        let url = `${this.apiClient.baseUrl}${this.getFileRoute(fileId)}/thumbnail`;
        if (timestamp) {
            url += `?${timestamp}`;
        }

        return url;
    }

    getFilePreviewUrl(fileId: string, timestamp: number) {
        let url = `${this.apiClient.baseUrl}${this.getFileRoute(fileId)}/preview`;
        if (timestamp) {
            url += `?${timestamp}`;
        }

        return url;
    }

    getFilePublicLink = async (fileId: string) => {
        return this.doFetch(
            `${this.getFileRoute(fileId)}/link`,
            {method: 'get'},
        );
    };

    uploadPostAttachment = (
        file: FileInfo,
        channelId: string,
        onProgress: (fractionCompleted: number, bytesRead?: number | null | undefined) => void,
        onComplete: (response: ClientResponse) => void,
        onError: (response: ClientResponseError) => void,
        skipBytes = 0,
    ) => {
        const url = this.getFilesRoute();
        const options: UploadRequestOptions = {
            skipBytes,
            method: 'POST',
            multipart: {
                data: {
                    channel_id: channelId,
                },
            },
            timeoutInterval: toMilliseconds({minutes: 3}),
        };
        if (!file.localPath) {
            throw new Error('file does not have local path defined');
        }

        const promise = this.apiClient.upload(url, file.localPath, options) as ProgressPromise<ClientResponse>;
        promise.progress!(onProgress).then(onComplete).catch(onError);
        return promise.cancel!;
    };

    searchFilesWithParams = async (teamId: string, params: FileSearchParams) => {
        this.analytics?.trackAPI('api_files_search');
        const endpoint = teamId ? `${this.getTeamRoute(teamId)}/files/search` : `${this.getFilesRoute()}/search`;
        return this.doFetch(endpoint, {method: 'post', body: params});
    };

    searchFiles = async (teamId: string, terms: string, isOrSearch: boolean) => {
        return this.searchFilesWithParams(teamId, {terms, is_or_search: isOrSearch});
    };
};

export default ClientFiles;
