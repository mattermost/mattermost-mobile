// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Detox reports a missing atIndex(n) as an index/out-of-bounds error naming how many
 * elements matched. A non-hittable or obscured element reports a visibility or
 * hittability failure instead, which must not be treated as "try a lower index".
 */
const isIndexOutOfBounds = (error: unknown): boolean => {
    const message = String((error as {message?: unknown})?.message ?? error).toLowerCase();
    return message.includes('out of bounds') ||
        message.includes('index') ||
        message.includes('but only') ||
        message.includes('no elements found');
};

class NavigationHeader {
    testID = {
        backButton: 'navigation.header.back',
        headerTitle: 'navigation.header.title',
        headerSubtitle: 'navigation.header.subtitle',
        largeHeaderTitle: 'navigation.large_header.title',
        largeHeaderSubtitle: 'navigation.large_header.subtitle',
        searchInput: 'navigation.header.search_bar.search.input',
        searchClearButton: 'navigation.header.search_bar.search.clear.button',
        searchCancelButton: 'navigation.header.search_bar.search.cancel.button',
    };

    backButton = element(by.id(this.testID.backButton));
    headerTitle = element(by.id(this.testID.headerTitle));
    headerSubtitle = element(by.id(this.testID.headerSubtitle));
    largeHeaderTitle = element(by.id(this.testID.largeHeaderTitle));
    largeHeaderSubtitle = element(by.id(this.testID.largeHeaderSubtitle));
    searchInput = element(by.id(this.testID.searchInput));
    searchClearButton = element(by.id(this.testID.searchClearButton));
    searchCancelButton = element(by.id(this.testID.searchCancelButton));

    tapBackButton = async (index = 0) => {
        await element(by.id(this.testID.backButton)).atIndex(index).tap();
    };

    tapTopmostBackButton = async (maxIndex = 2) => {
        /* eslint-disable no-await-in-loop */
        for (let index = maxIndex; index >= 0; index -= 1) {
            try {
                await element(by.id(this.testID.backButton)).atIndex(index).tap();
                return;
            } catch (error) {
                // Only an out-of-bounds index means "fewer headers are mounted, try a
                // lower one". Anything else — a back button that exists but is covered,
                // or a tap that landed somewhere unexpected — is a real failure, and
                // swallowing it here would tap a DIFFERENT header's back button and
                // leave the app on an unexpected screen for the rest of the spec.
                if (!isIndexOutOfBounds(error)) {
                    throw error;
                }
            }
        }
        /* eslint-enable no-await-in-loop */
        throw new Error(`No hittable ${this.testID.backButton} found (tried indices ${maxIndex}..0)`);
    };
}

const navigationHeader = new NavigationHeader();
export default navigationHeader;
