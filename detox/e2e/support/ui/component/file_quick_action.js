// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class FileQuickAction {
    testID = {
        fileQuickAction: 'post_draft.file_quick_action',
        fileQuickActionDisabled: 'post_draft.file_quick_action.disabled',
    }

    fileQuickAction = element(by.id(this.testID.fileQuickAction));
    fileQuickActionDisabled = element(by.id(this.testID.fileQuickActionDisabled));

    toBeVisible = async (options = {disabled: false}) => {
        if (options.disabled) {
            await expect(element(by.id(this.testID.fileQuickActionDisabled))).toBeVisible();
            return this.fileQuickActionDisabled;
        }

        await expect(element(by.id(this.testID.fileQuickAction))).toBeVisible();
        return this.fileQuickAction;
    }
}

const fileQuickAction = new FileQuickAction();
export default fileQuickAction;
