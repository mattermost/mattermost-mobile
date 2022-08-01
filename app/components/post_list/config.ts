// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const INITIAL_BATCH_TO_RENDER = 10;
export const SCROLL_POSITION_CONFIG = {

    // To avoid scrolling the list when new messages arrives
    // if the user is not at the bottom
    minIndexForVisible: 0,

    // If the user is at the bottom or 60px from the bottom
    // auto scroll show the new message
    autoscrollToTopThreshold: 60,
};
export const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 500,
};
