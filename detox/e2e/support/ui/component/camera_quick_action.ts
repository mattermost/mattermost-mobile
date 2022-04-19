// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class CameraQuickAction {
    testID = {
        cameraActionSuffix: 'post_draft.quick_actions.camera_action',
        cameraActionDisabledSuffix: 'post_draft.quick_actions.camera_action.disabled',
    };

    getCameraQuickAction = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.cameraActionSuffix}`));
    };

    getCameraQuickActionDisabled = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.cameraActionDisabledSuffix}`));
    };
}

const cameraQuickAction = new CameraQuickAction();
export default cameraQuickAction;
