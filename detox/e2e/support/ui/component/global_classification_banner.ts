// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

class GlobalClassificationBanner {
    testID = {
        banner: 'global_classification_banner',
    };

    banner = element(by.id(this.testID.banner));

    // The banner is driven by classification property fields+values that the app fetches after
    // connect/reload. On slower servers those propagate a few seconds after setup, so wait for the
    // banner rather than asserting immediately (the numeric arg to toBeVisible is a visibility
    // percentage threshold, NOT a timeout).
    toBeVisible = async () => {
        await waitFor(this.banner).toBeVisible(25).withTimeout(timeouts.HALF_MIN);
        return this.banner;
    };

    toNotBeVisible = async () => {
        await expect(this.banner).not.toBeVisible();
    };
}

const globalClassificationBanner = new GlobalClassificationBanner();
export default globalClassificationBanner;
