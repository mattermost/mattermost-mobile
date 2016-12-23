// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function getUser(state, id) {
    return state.entities.users.profiles[id];
}
