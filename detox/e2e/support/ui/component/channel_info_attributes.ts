// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {waitFor} from 'detox';

// testIDs are defined in app/components/channel_info_attributes/attribute_row.tsx,
// app/components/channel_info_attributes/channel_info_attributes.tsx and
// app/components/channel_attribute_editor/index.tsx

class ChannelInfoAttributes {
    testID = {
        container: 'channel_info.attributes',
    };

    container = element(by.id(this.testID.container));

    getRow = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}`));

    // Only present when the row is editable.
    getEditableRow = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.edit`));

    getChip = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.chip`));

    getChipValue = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.chip.value`));

    getNotSet = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.not_set`));

    getLockReason = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.lock`));

    getError = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.error`));

    getEditorSheet = (fieldName: string) => element(by.id(`channel_attribute_editor.${fieldName}.screen`));

    getEditorOption = (fieldName: string, optionId: string) => element(by.id(`channel_attribute_editor.${fieldName}.option.${optionId}`));

    getEditorClear = (fieldName: string) => element(by.id(`channel_attribute_editor.${fieldName}.clear`));

    getEditorInput = (fieldName: string) => element(by.id(`channel_attribute_editor.${fieldName}.input`));

    toBeVisible = async () => {
        await waitFor(this.container).toBeVisible().withTimeout(timeouts.HALF_MIN);
        return this.container;
    };

    toNotBeVisible = async () => {
        await waitFor(this.container).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    openEditor = async (fieldName: string) => {
        await waitFor(this.getEditableRow(fieldName)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.getEditableRow(fieldName).tap();
        await waitFor(this.getEditorSheet(fieldName)).toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    // Single-select commits on tap; there is no save step.
    selectOption = async (fieldName: string, optionId: string) => {
        await waitFor(this.getEditorOption(fieldName, optionId)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.getEditorOption(fieldName, optionId).tap();
        await waitFor(this.getEditorSheet(fieldName)).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    closeEditor = async (fieldName: string) => {
        await this.getEditorSheet(fieldName).swipe('down', 'fast');
        await waitFor(this.getEditorSheet(fieldName)).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const channelInfoAttributes = new ChannelInfoAttributes();
export default channelInfoAttributes;
