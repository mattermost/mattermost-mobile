// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {expect} from 'detox';

class GlobalClassificationBanner {
    testID = {
        banner: 'global_classification_banner',
    };

    banner = element(by.id(this.testID.banner));

    toBeVisible = async () => {
        await expect(this.banner).toBeVisible(25);
        return this.banner;
    };

    toNotBeVisible = async () => {
        await expect(this.banner).not.toBeVisible();
    };
}

const globalClassificationBanner = new GlobalClassificationBanner();
export default globalClassificationBanner;
