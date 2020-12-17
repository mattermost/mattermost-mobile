// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';
import {field, immutableRelation} from '@nozbe/watermelondb/decorators';

import {MM_TABLES} from '@constants/database';
import Post from '@typings/database/post';

const {POST} = MM_TABLES.SERVER;

/**
 * The File model works in pair with the Post model.  It hosts information about the files shared in a Post
 */
export default class File extends Model {
    /** table (entity name) : File */
    static table = MM_TABLES.SERVER.FILE;

    /** associations : Describes every relationship to this entity. */
    static associations: Associations = {

        /** A POST has a 1:N relationship with FILE. */
        [POST]: {type: 'belongs_to', key: 'post_id'},
    };

    /** extension : The file's extension */
    @field('extension') extension: string | undefined;

    /** height : The height for the image */
    @field('height') height: number | undefined;

    /** image_thumbnail : A base64 representation of an image */
    @field('image_thumbnail') imageThumbnail: string | undefined;

    /** local_path : Local path of the file that has been uploaded to server */
    @field('local_path') localPath: string | undefined;

    /** mime_type : The media type */
    @field('mime_type') mimeType: string | undefined;

    /** name : The name for the file object */
    @field('name') name: string | undefined;

    /** post_id : The foreign key of the related Post model */
    @field('post_id') postId: string | undefined;

    /** size : The numeric value of the size for the file */
    @field('size') size: number | undefined;

    /** width : The width of the file object/image */
    @field('width') width: number | undefined;

    /** post : The related Post record for this file */
    @immutableRelation(POST, 'post_id') post: Post | undefined;
}
