// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as FileSystem from 'expo-file-system';

export type Dictionary<T> = {
    [key: string]: T;
};

export type ErrorText = Partial<ClientErrorProps> | string;

export type ExtractedFileInfo = Partial<FileSystem.FileInfo> & { name: string; mime_type: string}
