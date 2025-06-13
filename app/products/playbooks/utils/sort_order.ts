// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getSortOrder(items: Array<{id: string}>) {
    return items.map((item) => item.id);
}
