// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {timeouts} from '@support/utils';
import {waitFor} from 'detox';

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
        await waitFor(this.container).toBeVisible().withTimeout(timeouts.HALF_MIN);
        return this.container;
    };

    toNotBeVisible = async () => {
        // Use waitFor rather than an immediate expect — the chip row may take a moment
        // to settle after navigation (e.g. DM channels where no chip should appear).
        await waitFor(this.container).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const channelAttributeLabels = new ChannelAttributeLabels();
export default channelAttributeLabels;
