// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@constants';
import {ensureNumber} from '@utils/types';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

export function isBoRPost(post: PostModel | Post): boolean {
    return Boolean(post.type && post.type === Post.POST_TYPES.BURN_ON_READ);
}

export function isUnrevealedBoRPost(post: Post | PostModel): boolean {
    return isBoRPost(post) && Boolean(!post.metadata?.expire_at);
}

export function isOwnBoRPost(post: PostModel, currentUserId?: UserModel['id']): boolean {
    return isBoRPost(post) && post.userId === currentUserId;
}

function isBoRPostExpiredForMe(post: PostModel): boolean {
    return Boolean(post.metadata?.expire_at) && post.metadata!.expire_at! < Date.now();
}

function isBorPostExpiredForAll(post: PostModel): boolean {
    return Boolean(post.props?.expire_at) && ensureNumber(post.props!.expire_at!) < Date.now();
}

export function isExpiredBoRPost(post: PostModel): boolean {
    return isBoRPost(post) && (isBorPostExpiredForAll(post) || isBoRPostExpiredForMe(post));
}
