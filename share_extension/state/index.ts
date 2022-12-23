// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {NativeModules} from 'react-native';
import {BehaviorSubject} from 'rxjs';

const ShareModule: NativeShareExtension = NativeModules.MattermostShare;

const defaultState: ShareExtensionState = {
    closeExtension: ShareModule.close,
    channelId: undefined,
    files: [],
    globalError: false,
    linkPreviewUrl: undefined,
    message: undefined,
    serverUrl: undefined,
    userId: undefined,
};

const subject: BehaviorSubject<ShareExtensionState> = new BehaviorSubject(defaultState);

export const getShareExtensionState = () => {
    return subject.value;
};

export const setShareExtensionState = (state: Omit<ShareExtensionState, 'closeExtension' | 'globalError'>) => {
    const prevState = getShareExtensionState();
    subject.next({...prevState, ...state});
};

export const setShareExtensionGlobalError = (globalError: boolean) => {
    const state = getShareExtensionState();
    const newState = {
        ...state,
        globalError,
    };
    setShareExtensionState(newState);
};

export const setShareExtensionMessage = (message?: string) => {
    const state = getShareExtensionState();
    const newState = {
        ...state,
        message,
    };
    setShareExtensionState(newState);
};

export const setShareExtensionServerUrl = (serverUrl: string) => {
    const state = getShareExtensionState();
    const newState = {
        ...state,
        serverUrl,
    };
    setShareExtensionState(newState);
};

export const setShareExtensionUserAndChannelIds = (userId: string, channelId: string) => {
    const state = getShareExtensionState();
    const newState = {
        ...state,
        channelId,
        userId,
    };
    setShareExtensionState(newState);
};

export const setShareExtensionUserId = (userId: string) => {
    const state = getShareExtensionState();
    const newState = {
        ...state,
        userId,
    };
    setShareExtensionState(newState);
};

export const setShareExtensionChannelId = (channelId: string) => {
    const state = getShareExtensionState();
    const newState = {
        ...state,
        channelId,
    };
    setShareExtensionState(newState);
};

export const removeShareExtensionFile = (file: SharedItem) => {
    const state = getShareExtensionState();
    const files = [...state.files];
    const index = files.findIndex((f) => f === file);
    if (index > -1) {
        files.splice(index, 1);
        const newState = {
            ...state,
            files,
        };
        setShareExtensionState(newState);
    }
};

export const useShareExtensionState = () => {
    const [state, setState] = useState(defaultState);

    useEffect(() => {
        const sub = subject.subscribe(setState);

        return () => sub.unsubscribe();
    }, []);

    return state;
};

export const useShareExtensionServerUrl = () => {
    const state = useShareExtensionState();
    const [serverUrl, setServerUrl] = useState(state.serverUrl);

    useEffect(() => {
        setServerUrl(state.serverUrl);
    }, [state.serverUrl]);

    return serverUrl;
};

export const useShareExtensionMessage = () => {
    const state = useShareExtensionState();
    const [message, setMessage] = useState(state.message);

    useEffect(() => {
        setMessage(state.message);
    }, [state.message]);

    return message;
};

export const useShareExtensionFiles = () => {
    const state = useShareExtensionState();
    const [files, setFiles] = useState(state.files);

    useEffect(() => {
        setFiles(state.files);
    }, [state.files]);

    return files;
};
