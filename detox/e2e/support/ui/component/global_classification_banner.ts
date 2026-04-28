// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class GlobalClassificationBanner {
    testID = {
        banner: 'global_classification_banner',
    };

    banner = element(by.id(this.testID.banner));

    toBeVisible = async () => {
        await expect(this.banner).toBeVisible();
        return this.banner;
    };

    toNotBeVisible = async () => {
        await expect(this.banner).not.toBeVisible();
    };
}

const globalClassificationBanner = new GlobalClassificationBanner();
export default globalClassificationBanner;
