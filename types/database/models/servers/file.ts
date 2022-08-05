// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PostModel from './post';
import type {Relation, Model} from '@nozbe/watermelondb';
import type {Associations} from '@nozbe/watermelondb/Model';

/**
 * The File model works in pair with the Post model.  It hosts information about the files shared in a Post
 */
declare class FileModel extends Model {
    /** table (name) : File */
    static table: string;

    /** associations : Describes every relationship to this table. */
    static associations: Associations;

    /** extension : The file's extension */
    extension: string;

    /** height : The height for the image */
    height: number;

    /** image_thumbnail : A base64 representation of an image */
    imageThumbnail: string;

    /** local_path : Local path of the file that has been uploaded to server */
    localPath: string | null;

    /** mime_type : The media type */
    mimeType: string;

    /** name : The name for the file object */
    name: string;

    /** post_id : The foreign key of the related Post model */
    postId: string;

    /** size : The numeric value of the size for the file */
    size: number;

    /** width : The width of the file object/image */
    width: number;

    /** post : The related Post record for this file */
    post: Relation<PostModel>;

    toFileInfo: (authorId: string) => FileInfo;
}

export default FileModel;
