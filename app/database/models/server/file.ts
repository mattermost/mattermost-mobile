// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {field, immutableRelation} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';

import type {Relation} from '@nozbe/watermelondb';
import type FileModelInterface from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';

const {FILE, POST} = MM_TABLES.SERVER;

/**
 * The File model works in pair with the Post model.  It hosts information about the files attached to a Post
 */
export default class FileModel extends Model implements FileModelInterface {
    /** table (name) : File */
    static table = FILE;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A POST has a 1:N relationship with FILE. */
        [POST]: {type: 'belongs_to', key: 'post_id'},
    };

    /** extension : The file's extension */
    @field('extension') extension!: string;

    /** height : The height for the image */
    @field('height') height!: number;

    /** image_thumbnail : A base64 representation of an image */
    @field('image_thumbnail') imageThumbnail!: string;

    /** local_path : Local path of the file that has been uploaded to server */
    @field('local_path') localPath!: string;

    /** mime_type : The media type */
    @field('mime_type') mimeType!: string;

    /** name : The name for the file object */
    @field('name') name!: string;

    /** post_id : The foreign key of the related Post model */
    @field('post_id') postId!: string;

    /** size : The numeric value of the size for the file */
    @field('size') size!: number;

    /** width : The width of the file object/image */
    @field('width') width!: number;

    /** post : The related Post record for this file */
    @immutableRelation(POST, 'post_id') post!: Relation<PostModel>;

    toFileInfo = (authorId: string): FileInfo => ({
        id: this.id,
        user_id: authorId,
        post_id: this.postId,
        name: this.name,
        extension: this.extension,
        mini_preview: this.imageThumbnail,
        size: this.size,
        mime_type: this.mimeType,
        height: this.height,
        has_preview_image: Boolean(this.imageThumbnail),
        localPath: this.localPath,
        width: this.width,
    });
}
