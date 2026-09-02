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

    // The row for one attribute, by the field's machine name.
    getRow = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}`));

    // Only present when the row is editable.
    getEditableRow = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.edit`));

    getChip = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.chip`));

    // The value text sits inside the chip, so its testID nests under the chip's.
    getChipValue = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.chip.value`));

    getNotSet = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.not_set`));

    // The explanation shown when the row cannot be edited.
    getLockReason = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.lock`));

    getError = (fieldName: string) => element(by.id(`channel_info.attributes.${fieldName}.error`));

    // The Set {attribute} sheet, opened by tapping an editable row.
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

    /**
     * Opens the Set {attribute} sheet for one row and waits for it to settle.
     *
     * Fails rather than silently doing nothing when the row is not editable: the
     * `.edit` testID only exists on a pressable row.
     */
    openEditor = async (fieldName: string) => {
        await waitFor(this.getEditableRow(fieldName)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.getEditableRow(fieldName).tap();
        await waitFor(this.getEditorSheet(fieldName)).toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    /**
     * Picks an option in the sheet. The sheet commits on choice for a single-select
     * field, so there is no save step to follow.
     */
    selectOption = async (fieldName: string, optionId: string) => {
        await waitFor(this.getEditorOption(fieldName, optionId)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.getEditorOption(fieldName, optionId).tap();
        await waitFor(this.getEditorSheet(fieldName)).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const channelInfoAttributes = new ChannelInfoAttributes();
export default channelInfoAttributes;
