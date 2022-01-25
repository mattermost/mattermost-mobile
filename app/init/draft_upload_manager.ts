// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientResponse, ClientResponseError} from '@mattermost/react-native-network-client';
import {AppState, AppStateStatus, DeviceEventEmitter} from 'react-native';

import {updateDraftFile} from '@actions/local/draft';
import {uploadFile} from '@actions/remote/file';
import {Events} from '@constants';
import {PROGRESS_TIME_TO_STORE} from '@constants/files';

type FileHandler = {
    [clientId: string]: {
        cancel?: () => void;
        fileInfo: FileInfo;
        serverUrl: string;
        channelId: string;
        rootId: string;
        lastTimeStored: number;
    };
}

class DraftUploadManager {
    private handlers: FileHandler = {};
    private previousAppState: AppStateStatus;

    constructor() {
        this.previousAppState = AppState.currentState;
        AppState.addEventListener('change', this.onAppStateChange);
    }

    public prepareUpload = (
        serverUrl: string,
        file: FileInfo,
        channelId: string,
        rootId: string,
        skipBytes = 0,
    ) => {
        this.handlers[file.clientId!] = {
            fileInfo: file,
            serverUrl,
            channelId,
            rootId,
            lastTimeStored: 0,
        };

        const onProgress = (progress: number) => {
            this.handleProgress(file.clientId!, progress);
        };

        const onComplete = (response: ClientResponse) => {
            this.handleComplete(response, file.clientId!);
        };

        const onError = (response: ClientResponseError) => {
            this.handleError(response.message, file.clientId!);
        };

        const {error, cancel} = uploadFile(serverUrl, file, channelId, onProgress, onComplete, onError, skipBytes);
        if (error) {
            this.handleError(error.message, file.clientId!);
            return;
        }
        this.handlers[file.clientId!].cancel = cancel;
    };

    public cancel = (clientId: string) => {
        const {cancel} = this.handlers[clientId];
        delete this.handlers[clientId];
        cancel?.();
    };

    public isLoading = (clientId: string) => {
        return Boolean(this.handlers[clientId]);
    };

    private handleProgress = (clientId: string, progress: number) => {
        const h = this.handlers[clientId];
        if (!h) {
            return;
        }

        h.fileInfo.progress = progress;

        DeviceEventEmitter.emit(`${Events.FILE_PROGRESS}_${clientId}`, progress);
        if (AppState.currentState !== 'active' && h.lastTimeStored + PROGRESS_TIME_TO_STORE < Date.now()) {
            updateDraftFile(h.serverUrl, h.channelId, h.rootId, this.handlers[clientId].fileInfo);
            h.lastTimeStored = Date.now();
        }
    };

    private handleComplete = (response: ClientResponse, clientId: string) => {
        const h = this.handlers[clientId];
        if (!h) {
            return;
        }
        if (response.code !== 201) {
            this.handleError((response.data as any).message, clientId);
            return;
        }
        if (!response.data) {
            this.handleError('Failed to upload the file: no data received', clientId);
            return;
        }
        const data = response.data.file_infos as FileInfo[];
        if (!data || !data.length) {
            this.handleError('Failed to upload the file: no data received', clientId);
            return;
        }

        delete this.handlers[clientId!];

        const fileInfo = data[0];
        fileInfo.clientId = h.fileInfo.clientId;
        fileInfo.localPath = h.fileInfo.localPath;

        updateDraftFile(h.serverUrl, h.channelId, h.rootId, this.handlers[clientId].fileInfo);
    };

    private handleError = (errorMessage: string, clientId: string) => {
        const h = this.handlers[clientId];
        delete this.handlers[clientId!];

        DeviceEventEmitter.emit(`${Events.FILE_UPLOAD_ERROR}_${clientId}`, errorMessage);

        const fileInfo = {...h.fileInfo};
        fileInfo.failed = true;
        updateDraftFile(h.serverUrl, h.channelId, h.rootId, this.handlers[clientId].fileInfo);
    };

    private onAppStateChange = async (appState: AppStateStatus) => {
        if (appState !== 'active' && this.previousAppState === 'active') {
            this.storeProgress();
        }

        this.previousAppState = appState;
    };

    private storeProgress = () => {
        for (const h of Object.values(this.handlers)) {
            updateDraftFile(h.serverUrl, h.channelId, h.rootId, h.fileInfo);
        }
    };
}

export default new DraftUploadManager();
