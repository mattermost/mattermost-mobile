// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Standalone mapping store kept dependency-free so unrelated modules
// (e.g. the websocket manager) can read "is a call ringing/active?"
// without pulling in the rest of the calls product surface.

export type NativeCallMapping = {
    serverUrl: string;
    channelId: string;
    postId: string;
    threadId: string;
};

const mappings = new Map<string, NativeCallMapping>();

export const setNativeCallMapping = (uuid: string, info: NativeCallMapping) => {
    mappings.set(uuid, info);
};

export const getNativeCallMapping = (uuid: string): NativeCallMapping | undefined => {
    return mappings.get(uuid);
};

export const clearNativeCallMapping = (uuid: string): boolean => {
    return mappings.delete(uuid);
};

export const getNativeCallUUIDForCall = (serverUrl: string, channelId: string): string | undefined => {
    for (const [uuid, mapping] of mappings) {
        if (mapping.serverUrl === serverUrl && mapping.channelId === channelId) {
            return uuid;
        }
    }
    return undefined;
};

export const hasActiveNativeCall = (): boolean => mappings.size > 0;
