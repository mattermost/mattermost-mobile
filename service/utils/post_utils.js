// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Constants} from 'service/constants';

export function isSystemMessage(post) {
    return post.type && post.type.startsWith(Constants.SYSTEM_MESSAGE_PREFIX);
}
