// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Relation} from '@nozbe/watermelondb';
import {immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {safeParseJSON} from '@utils/helpers';

import type PostModel from '@typings/database/models/servers/post';

const {POST, POST_METADATA} = MM_TABLES.SERVER;

/**
 * PostMetadata provides additional information on a POST
 */
export default class PostMetadataModel extends Model {
    /** table (name) : PostMetadata */
    static table = POST_METADATA;

    /** data : Different types of data ranging from embeds to images. */
    @json('data', safeParseJSON) data!: PostMetadata;

    /** post: The record representing the POST parent.  */
    @immutableRelation(POST, 'id') post!: Relation<PostModel>;
}
