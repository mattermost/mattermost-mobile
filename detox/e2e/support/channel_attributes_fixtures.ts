// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelListScreen, ChannelScreen} from '@support/ui/screen';
import {getRandomId, timeouts, wait} from '@support/utils';
import {by, device, element, waitFor} from 'detox';

// Option IDs for the test attribute field. Server requires exactly 26 alphanumeric characters
// (model.IsValidId).
export const ATTR_OPTION_IDS = {
    high: 'attroptionhigh000000000000',
    medium: 'attroptionmedium0000000000',
    low: 'attroptionlow0000000000000',
} as const;

export const TEST_FIELD_OPTIONS = [
    {id: ATTR_OPTION_IDS.high, name: 'HIGH', color: '#FF0000', rank: 1},
    {id: ATTR_OPTION_IDS.medium, name: 'MEDIUM', color: '#FFA500', rank: 2},
    {id: ATTR_OPTION_IDS.low, name: 'LOW', color: '#00AA00', rank: 3},
];

export const SECOND_FIELD_OPTIONS = [
    {id: 'attropt2high00000000000000', name: 'HIGH2', color: '#CC0000', rank: 1},
];

/**
 * Field names unique to one suite run. Attribute fields are server-wide, so a fixed name would
 * let a cleanup in one run delete fields another run is still using.
 */
export const makeChannelAttributeFieldNames = (suffix = getRandomId(6)) => {
    const names = {
        TEST_FIELD_NAME: `sensitivity_${suffix}`,

        // Second field for multi-chip tests (2 fields = MAX_VISIBLE_CHIPS boundary; no overflow).
        SECOND_FIELD_NAME: `classification2_${suffix}`,
        BANNER_MULTI_FIELD_NAME: `banner_multi_${suffix}`,
        BANNER_SELECT_FIELD_NAME: `banner_select_${suffix}`,
        BANNER_TEXT_FIELD_NAME: `banner_text_${suffix}`,

        // One multiselect attribute whose values each render as a chip and can exceed MAX_VISIBLE_CHIP_VALUES.
        MULTI_VALUE_FIELD_NAME: `multi_value_header_${suffix}`,
    };
    return {...names, ALL_TEST_FIELD_NAMES: Object.values(names)};
};

// Resolve a required option by name. Throws clearly if the option was not created rather than
// silently passing an undefined value that the server rejects with an opaque 400.
export function requireOption(optionIdsByName: Record<string, string | undefined>, name: string): string {
    const id = optionIdsByName[name];
    if (!id) {
        const available = Object.keys(optionIdsByName).join(', ');
        throw new Error(`Channel attributes test: option "${name}" not found. Available: [${available}]`);
    }
    return id;
}

// Navigate into a public channel by name from the channel list sidebar.
export async function openChannel(channelName: string) {
    await waitFor(element(by.id('channel_list_header.team_display_name'))).toExist().withTimeout(timeouts.TEN_SEC * 3);
    await wait(timeouts.TWO_SEC);
    await ChannelScreen.open('channels', channelName);
}

const ATTRIBUTE_RENDER_ATTEMPTS = 3;

/**
 * Run the navigation and assertions against a freshly reloaded app, retrying the whole cycle.
 *
 * The app reads the client config once at start and keeps its own copy, so a reload that races
 * a config change can bring the app up with the old flag value; only another reload clears that.
 */
export async function assertOnReloadedApp(steps: () => Promise<void>) {
    let lastError: unknown;

    /* eslint-disable no-await-in-loop -- each attempt reloads the app the previous one left behind */
    for (let attempt = 1; attempt <= ATTRIBUTE_RENDER_ATTEMPTS; attempt++) {
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
        try {
            await steps();
            return;
        } catch (error) {
            lastError = error;
        }
    }
    /* eslint-enable no-await-in-loop */

    throw lastError;
}
