// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import Model, {Associations} from '@nozbe/watermelondb/Model';
export default class Post extends Model {
    static table: string;
    static associations: Associations;
    channelId: string;
    createAt: number;
    deleteAt: number;
    edit_at: number;
    isPinned: boolean;
    message: string;
    originalId: string;
    pendingPostId: string;
    postId: string;
    previousPostId: string;
    props: string;
    rootId: string;
    type: string;
    userId: string;
}
