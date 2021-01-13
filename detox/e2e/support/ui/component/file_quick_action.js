// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class FileQuickAction {
    testID = {
        fileActionSuffix: 'post_draft.quick_actions.file_action',
        fileActionDisabledSuffix: 'post_draft.quick_actions.file_action.disabled',
    }

    getFileQuickAction = (screenPrefix) => {
        return element(by.id(`${screenPrefix}${this.testID.fileActionSuffix}`));
    }

    getFileQuickActionDisabled = (screenPrefix) => {
        return element(by.id(`${screenPrefix}${this.testID.fileActionDisabledSuffix}`));
    }
}

const fileQuickAction = new FileQuickAction();
export default fileQuickAction;
