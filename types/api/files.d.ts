// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type FileInfo = {
    id: string;
    user_id: string;
    post_id: string;
    create_at: number;
    update_at: number;
    delete_at: number;
    name: string;
    extension: string;
    size: number;
    mime_type: string;
    width: number;
    height: number;
    has_preview_image: boolean;
    clientId: string;
    localPath?: string;
    uri?: string;
    loading?: boolean;
};

type FilesState = {
    files: Dictionary<FileInfo>;
    fileIdsByPostId: Dictionary<Array<string>>;
    filePublicLink?: string;
};

type FileUploadResponse = {
    file_infos: FileInfo[];
    client_ids: string[];
};
