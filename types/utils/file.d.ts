// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ExtractedFileInfo = Partial<FileInfo> & { name: string; mime_type: string}

type UploadExtractedFile = (files?: ExtractedFileInfo[]) => void;
