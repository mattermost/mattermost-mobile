// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {waitFor} from 'detox';

import ChannelInfoAttributes from './channel_info_attributes';

// testIDs are defined in app/components/channel_attribute_form/channel_attribute_form.tsx.
// The Set {attribute} sheet itself is shared with Channel Info (PR A), so its
// testIDs are reused from ChannelInfoAttributes rather than duplicated here —
// see app/components/channel_attribute_editor/index.tsx.

class ChannelAttributeForm {
    testID = {
        container: 'channel_attribute_form',
    };

    container = element(by.id(this.testID.container));

    // Only present when the field is settable by the current user. Every row
    // this form renders is settable — see channel_attribute_form.tsx — so this
    // is the only per-row getter; there is no bare, non-`.edit` row testID.

    getEditableRow = (fieldName: string) => element(by.id(`channel_attribute_form.${fieldName}.edit`));

    getChip = (fieldName: string) => element(by.id(`channel_attribute_form.${fieldName}.chip`));

    getChipValue = (fieldName: string) => element(by.id(`channel_attribute_form.${fieldName}.chip.value`));

    getNotSet = (fieldName: string) => element(by.id(`channel_attribute_form.${fieldName}.not_set`));

    toBeVisible = async () => {
        await waitFor(this.container).toBeVisible().withTimeout(timeouts.TEN_SEC);
        return this.container;
    };

    toNotBeVisible = async () => {
        await waitFor(this.container).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    /**
     * Opens the Set {attribute} sheet for one row and waits for it to settle.
     */
    openEditor = async (fieldName: string) => {
        await waitFor(this.getEditableRow(fieldName)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await this.getEditableRow(fieldName).tap();
        await waitFor(ChannelInfoAttributes.getEditorSheet(fieldName)).toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    /**
     * Picks an option in the sheet, driving local form state rather than a write —
     * the sheet itself is identical to Channel Info's, so it commits the same way.
     */
    selectOption = async (fieldName: string, optionId: string) => {
        await waitFor(ChannelInfoAttributes.getEditorOption(fieldName, optionId)).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await ChannelInfoAttributes.getEditorOption(fieldName, optionId).tap();
        await waitFor(ChannelInfoAttributes.getEditorSheet(fieldName)).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const channelAttributeForm = new ChannelAttributeForm();
export default channelAttributeForm;
