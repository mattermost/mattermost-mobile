// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function normaliseButtonStyle(style: string | undefined): MmButtonStyle {
    if (style === 'primary' || style === 'danger') {
        return style;
    }
    return 'default';
}
