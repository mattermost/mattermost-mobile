// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class CameraQuickAction {
    testID = {
        cameraQuickAction: 'post_draft.camera_quick_action',
        cameraQuickActionDisabled: 'post_draft.camera_quick_action.disabled',
    }

    cameraQuickAction = element(by.id(this.testID.cameraQuickAction));
    cameraQuickActionDisabled = element(by.id(this.testID.cameraQuickActionDisabled));

    toBeVisible = async (options = {disabled: false}) => {
        if (options.disabled) {
            await expect(element(by.id(this.testID.cameraQuickActionDisabled))).toBeVisible();
            return this.cameraQuickActionDisabled;
        }

        await expect(element(by.id(this.testID.cameraQuickAction))).toBeVisible();
        return this.cameraQuickAction;
    }
}

const cameraQuickAction = new CameraQuickAction();
export default cameraQuickAction;
