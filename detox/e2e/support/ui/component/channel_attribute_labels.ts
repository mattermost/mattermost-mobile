// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {expect, waitFor} from 'detox';

// testIDs are defined in app/components/channel_attribute_labels/index.tsx
// and app/components/attribute_chip/index.tsx

class ChannelAttributeLabels {
    testID = {
        container: 'channel_attribute_labels',
        overflow: 'channel_attribute_labels.overflow',
        overflowSheet: 'channel_attribute_labels.overflow_sheet',
    };

    container = element(by.id(this.testID.container));
    overflow = element(by.id(this.testID.overflow));
    overflowSheet = element(by.id(this.testID.overflowSheet));

    // chip.{field.name} — the chip container for a given field
    getChip = (fieldName: string) => element(by.id(`channel_attribute_labels.chip.${fieldName}`));

    // chip.{field.name}.value — the value text inside the chip
    getChipValue = (fieldName: string) => element(by.id(`channel_attribute_labels.chip.${fieldName}.value`));

    toBeVisible = async () => {
        await waitFor(this.container).toBeVisible().withTimeout(timeouts.TEN_SEC);
        return this.container;
    };

    toNotBeVisible = async () => {
        await expect(this.container).not.toBeVisible();
    };
}

const channelAttributeLabels = new ChannelAttributeLabels();
export default channelAttributeLabels;
