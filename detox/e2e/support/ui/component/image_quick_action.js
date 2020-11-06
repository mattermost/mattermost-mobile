// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class ImageQuickAction {
    testID = {
        imageQuickAction: 'post_draft.image_quick_action',
        imageQuickActionDisabled: 'post_draft.image_quick_action.disabled',
    }

    imageQuickAction = element(by.id(this.testID.imageQuickAction));
    imageQuickActionDisabled = element(by.id(this.testID.imageQuickActionDisabled));

    toBeVisible = async (options = {disabled: false}) => {
        if (options.disabled) {
            await expect(element(by.id(this.testID.imageQuickActionDisabled))).toBeVisible();
            return this.imageQuickActionDisabled;
        }

        await expect(element(by.id(this.testID.imageQuickAction))).toBeVisible();
        return this.imageQuickAction;
    }
}

const imageQuickAction = new ImageQuickAction();
export default imageQuickAction;
