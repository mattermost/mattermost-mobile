// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type UserModel from '@typings/database/models/servers/user';

export function shouldUpdateUserRecord(e: UserModel, n: UserProfile) {
    return Boolean(n.update_at > e.updateAt || (n.status && n.status !== e.status));
}
