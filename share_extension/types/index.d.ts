// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

interface BodyRef {
    getValue(): string | undefined;
}

interface ShareFileInfo {
    extension?: string;
    filename: string;
    fullPath: string;
    mimeType: string;
    size: string;
    type: string;
}

interface ShareItem {
    type: string;
    value: string;
}

interface ShareState {
    authorized?: boolean;
    error?: string;
    hasPermission?: boolean;
    loading: boolean;
    files: Array<ShareFileInfo>;
    totalSize?: number;
    value?: string;
}

interface ProcessedSharedItems {
    error?: string;
    files: Array<ShareFileInfo>;
    value?: string;
    totalSize?: number;
}

