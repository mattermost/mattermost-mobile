// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

let isToolTipVisible = false;

export function setToolTipVisible(visible = true) {
    isToolTipVisible = visible;
}

export function getToolTipVisible() {
    return isToolTipVisible;
}
