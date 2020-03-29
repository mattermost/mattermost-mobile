// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const OPTION_HEIGHT = 50;
const BOTTOM_HEIGHT = 18;
export const MAX_INITIAL_POSITION_MULTIPLIER = 0.75;

export function getInitialPosition(deviceHeight, marginFromTop) {
    const computedSlidePanelHeight = deviceHeight - marginFromTop;
    const maxInitialPosition = deviceHeight * MAX_INITIAL_POSITION_MULTIPLIER;

    if (computedSlidePanelHeight <= maxInitialPosition) {
        // Show all options to the user
        return computedSlidePanelHeight;
    }

    const optionHeightWithBorder = OPTION_HEIGHT + 1;

    // Partially show options to user with the first hidden option in mid appearance
    // to indicate that are still option/s available on slide up
    let adjustedInitialPosition = computedSlidePanelHeight - BOTTOM_HEIGHT - (optionHeightWithBorder / 2);
    while (adjustedInitialPosition > maxInitialPosition) {
        adjustedInitialPosition -= optionHeightWithBorder;
    }

    return adjustedInitialPosition;
}
