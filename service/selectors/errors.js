// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function getDisplayableErrors(state) {
    return state.errors.filter((error) => error.displayable);
}
