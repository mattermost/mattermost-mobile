// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class DraftUploadManager {
    constructor() {}

    public prepareUpload = (
        serverUrl: string,
        file: FileInfo,
        channelId: string,
        rootId: string,
        skipBytes = 0,
    ) => {};

    public cancel = (clientId: string) => {};

    public isUploading = (clientId: string) => {
        return true;
    };

    public registerProgressHandler = (clientId: string, callback: (progress: number, bytes: number) => void) => {
        return () => {};
    };

    public registerErrorHandler = (clientId: string, callback: (errMessage: string) => void) => {
        return () => {};
    };
}

export default new DraftUploadManager();
