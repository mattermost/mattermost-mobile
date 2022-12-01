// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface NativeShareExtension {
    close: (data: ShareExtensionDataToSend|null) => void;
    getCurrentActivityName: () => string;
    getSharedData: () => Promise<SharedItem[]>;
}

interface ShareExtensionDataToSend {
    channelId: string;
    files: SharedItem[];
    message: string;
    serverUrl: string;
    userId: string;
}

interface SharedItem {
    extension: string;
    filename?: string;
    isString: boolean;
    size?: number;
    type: string;
    value: string;
    height?: number;
    width?: number;
    videoThumb?: string;
}

interface ShareExtensionState {
    channelId?: string;
    closeExtension: (data: ShareExtensionDataToSend | null) => void;
    files: SharedItem[];
    globalError: boolean;
    linkPreviewUrl?: string;
    message?: string;
    serverUrl?: string;
    userId?: string;
}
