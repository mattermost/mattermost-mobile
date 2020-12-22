// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function buildPreference(category, userId, name, value = 'true') {
    return {
        user_id: userId,
        category,
        name,
        value,
    };
}
