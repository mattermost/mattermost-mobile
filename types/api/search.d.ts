// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type FileSearchRequest = {
    error?: unknown;
    file_infos?: {[id: string]: FileInfo};
    next_file_info_id?: string;
    order?: string[];
    prev_file_info_id?: string;
}

type PostSearchRequest = {
    error?: unknown;
    order?: string[];
    posts?: Post[];
    matches?: SearchMatches;
}
