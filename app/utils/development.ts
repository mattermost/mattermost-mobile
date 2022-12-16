// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Utils meant to be used only for development and debugging.
// Do not use these in production code.

export async function waitFor(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}
