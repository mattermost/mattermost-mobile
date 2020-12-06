// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Model, {Associations} from '@nozbe/watermelondb/Model';

import Post from '@typings/database/post';
import User from '@typings/database/user';

export default class Reaction extends Model {
    static table: string;
    static associations: Associations;
    createAt: number;
    emojiName: string;
    postId: string;
    reactionId: string;
    userId: string;
    reactionUser: User;
    reactionPost: Post;
}
