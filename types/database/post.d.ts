// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Channel from '@typings/database/channel';
import Draft from '@typings/database/draft';
import File from '@typings/database/file';
import Model, {Associations} from '@nozbe/watermelondb/Model';
import PostInThread from '@typings/database/posts_in_thread';
import PostMetadata from '@typings/database/post_metadata';
import Reaction from '@typings/database/reaction';
import User from '@typings/database/user';

export default class Post extends Model {
    static table: string;
    static associations: Associations;
    channelId: string;
    createAt: number;
    deleteAt: number;
    editAt: number;
    isPinned: boolean;
    message: string;
    originalId: string;
    pendingPostId: string;
    previousPostId: string;
    rootId: string;
    type: string;
    userId: string;
    props: string[];
    draft: Draft;
    file: File;
    postInThread: PostInThread;
    postMetadata: PostMetadata;
    reaction: Reaction;
    postUser: User;
    postChannel: Channel;
}
