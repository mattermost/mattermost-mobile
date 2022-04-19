// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class ImageQuickAction {
    testID = {
        imageActionSuffix: 'post_draft.quick_actions.image_action',
        imageActionDisabledSuffix: 'post_draft.quick_actions.image_action.disabled',
    };

    getImageQuickAction = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.imageActionSuffix}`));
    };

    getImageQuickActionDisabled = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.imageActionDisabledSuffix}`));
    };
}

const imageQuickAction = new ImageQuickAction();
export default imageQuickAction;
