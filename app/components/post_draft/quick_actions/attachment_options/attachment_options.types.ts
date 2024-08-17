// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type AttachmentOptionsProps = {
    canUploadFiles: boolean;
    fileCount: number;
    maxFileCount: number;
    maxFilesReached: boolean;
    onUploadFiles: (file: FileInfo[]) => void;
    testID?: string;
};
