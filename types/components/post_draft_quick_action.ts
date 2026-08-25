// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface QuickActionAttachmentProps {
    disabled: boolean;
    fileCount?: number;
    maxFilesReached: boolean;
    maxFileCount: number;
    onUploadFiles: (files: ExtractedFileInfo[]) => void;
    showAttachLogs?: boolean;
    testID?: string;
}
