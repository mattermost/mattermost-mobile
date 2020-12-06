// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';

export default class File extends Model {
    static table: string;
    static associations: Associations;
    extension: string;
    fileId: string;
    draftId: string;
    height: number;
    imageThumbnail: string;
    localPath: string;
    mimeType: string;
    name: string;
    postId: string;
    size: number;
    width: number;
}
