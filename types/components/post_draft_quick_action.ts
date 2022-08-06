// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Asset} from 'react-native-image-picker';

export interface QuickActionAttachmentProps {
    disabled: boolean;
    fileCount?: number;
    maxFilesReached: boolean;
    maxFileCount: number;
    onUploadFiles: (files: Asset[]) => void;
    testID?: string;
}
