// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isIos, timeouts} from '@support/utils';
import {waitFor} from 'detox';

// testIDs are defined in app/components/channel_attribute_labels/index.tsx
// and app/components/attribute_chip/index.tsx

class ChannelAttributeLabels {
    testID = {
        container: 'channel_attribute_labels',
        overflow: 'channel_attribute_labels.overflow',

        // BottomSheetContent (screens/bottom_sheet/content.tsx) renders its outer
        // container with `${testID}.screen`, not the bare testID passed to it.
        overflowSheet: 'channel_attribute_labels.overflow_sheet.screen',
    };

    container = element(by.id(this.testID.container));
    overflow = element(by.id(this.testID.overflow));
    overflowSheet = element(by.id(this.testID.overflowSheet));

    // chip.{field.name} — the chip container for a single-valued field.
    // chip.{field.name}.{index} — one chip among several values on a multi-valued field
    // (multiselect, graph). Pass index only when the field has more than one value.
    getChip = (fieldName: string, index?: number) => element(by.id(
        index === undefined ? `channel_attribute_labels.chip.${fieldName}` : `channel_attribute_labels.chip.${fieldName}.${index}`,
    ));

    // .value — the value text inside the chip identified by getChip's testID.
    getChipValue = (fieldName: string, index?: number) => element(by.id(
        `${index === undefined ? `channel_attribute_labels.chip.${fieldName}` : `channel_attribute_labels.chip.${fieldName}.${index}`}.value`,
    ));

    // Same dismissal as ThreadOptionsScreen.close(): swipe the sheet down on iOS,
    // hardware back on Android.
    closeOverflowSheet = async () => {
        if (isIos()) {
            await this.overflowSheet.swipe('down');
        } else {
            await device.pressBack();
        }
        await waitFor(this.overflowSheet).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    // overflow_sheet.chip.{field.name}[.{index}] — the overflow sheet lists every header
    // attribute, so its chips carry their own prefix to stay distinct from the header's.
    getSheetChipValue = (fieldName: string, index?: number) => element(by.id(
        `${index === undefined ? `channel_attribute_labels.overflow_sheet.chip.${fieldName}` : `channel_attribute_labels.overflow_sheet.chip.${fieldName}.${index}`}.value`,
    ));

    toNotBeVisible = async () => {
        // Use waitFor rather than an immediate expect — the chip row may take a moment
        // to settle after navigation (e.g. DM channels where no chip should appear).
        await waitFor(this.container).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };
}

const channelAttributeLabels = new ChannelAttributeLabels();
export default channelAttributeLabels;
