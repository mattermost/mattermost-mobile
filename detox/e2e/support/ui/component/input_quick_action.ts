// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class InputQuickAction {
    testID = {
        atInputActionSuffix: 'post_draft.quick_actions.at_input_action',
        atInputActionDisabledSuffix: 'post_draft.quick_actions.at_input_action.disabled',
        slashInputActionSuffix: 'post_draft.quick_actions.slash_input_action',
        slashInputActionDisabledSuffix: 'post_draft.quick_actions.slash_input_action.disabled',
    };

    getAtInputQuickAction = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.atInputActionSuffix}`));
    };

    getAtInputQuickActionDisabled = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.atInputActionDisabledSuffix}`));
    };

    getSlashInputQuickAction = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.slashInputActionSuffix}`));
    };

    getSlashInputQuickActionDisabled = (screenPrefix: string) => {
        return element(by.id(`${screenPrefix}${this.testID.slashInputActionDisabledSuffix}`));
    };
}

const inputQuickAction = new InputQuickAction();
export default inputQuickAction;
