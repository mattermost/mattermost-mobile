// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function nonBreakingString(s: string) {
    return s.replace(' ', '\xa0');
}
