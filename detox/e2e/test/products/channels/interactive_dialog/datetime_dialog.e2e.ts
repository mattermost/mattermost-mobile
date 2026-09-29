// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {execSync} from 'child_process';

import {
    Command,
    Setup,
    User,
} from '@support/server_api';
import {
    serverOneUrl,
    siteOneUrl,
    webhookBaseUrl,
} from '@support/test_config';
import {
    ChannelListScreen,
    ChannelScreen,
    HomeScreen,
    InteractiveDialogScreen,
    LoginScreen,
    ServerScreen,
} from '@support/ui/screen';
import {isAndroid, timeouts, wait} from '@support/utils';
import {expect} from 'detox';
import moment from 'moment-timezone';

const channelsCategory = 'channels';
const serverOneDisplayName = 'Server 1';
const DIALOG_TRIGGER = 'datetimedialog';

// The webhook fixture pins every element's default so assertions never depend on the
// device clock. See `onDatetimeDialogRequest` in detox/webhook_server.js.
//
// The date assertions are deliberately independent of the device timezone: the fixture's
// location-timezone field sits at UTC+14, so its midnight is 10:00 the previous day in
// UTC and renders as Jun 14 in every zone except its own. That keeps this suite honest on
// CI, where the Android emulator is pinned to America/New_York and the macOS runner is UTC
// — neither of which would expose a device-local off-by-one.
//
// 09:00Z keeps the datetime default on Jun 15 for any device offset at or above UTC-9.
const DEFAULT_DATETIME_UTC = '2026-06-15T09:00:00Z';
const DEFAULT_DAY = 'Jun 15, 2026';

// Native date-picker day cells are matched by their content description.
const PICK_DAY_DESC = '20 June 2026';
const PICKED_DAY = 'Jun 20, 2026';
const DAY_BEFORE_DEFAULT = 'Jun 14, 2026';
const DAY_BEFORE_PICKED = 'Jun 19, 2026';

const readDeviceTimezone = () => {
    if (isAndroid()) {
        return execSync(`adb -s ${device.id} shell getprop persist.sys.timezone`).toString().trim();
    }

    // iOS simulators inherit the host timezone, and the test runner is that host.
    return moment.tz.guess();
};

/**
 * The datetime field has no location timezone and the test user has no timezone, so it
 * renders in device-local time. Build the expected label from the device's own zone
 * rather than hardcoding one, so the suite is not pinned to a single emulator setup.
 */
const datetimeLabel = (deviceTimezone: string, minute?: number) => {
    let m = moment.tz(DEFAULT_DATETIME_UTC, deviceTimezone);
    if (minute !== undefined) {
        m = m.clone().minute(minute);
    }
    return `${m.format('MMM D, YYYY')} at ${m.format('h:mm A')}`;
};

// Confirm/dismiss buttons of the stock AlertDialog-based pickers.
const OK = 'OK';

/**
 * Taps a cell inside a stock Android picker by its accessibility label.
 *
 * The calendar's day cells and the clock's minute markers are drawn onto a Canvas and
 * exposed only as virtual accessibility nodes, so Espresso — and therefore by.label() —
 * cannot match them. uiautomator can see them, so resolve the node's bounds from the
 * accessibility tree and tap its centre. Bounds are read at runtime rather than hardcoded
 * so the helper survives a different screen density or picker layout.
 */
const tapPickerCellByLabel = (label: string) => {
    const serial = device.id;
    execSync(`adb -s ${serial} shell uiautomator dump /sdcard/detox-picker.xml`, {stdio: 'ignore'});
    const xml = execSync(`adb -s ${serial} shell cat /sdcard/detox-picker.xml`).toString();

    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = xml.match(new RegExp(`content-desc="${escapedLabel}"[^>]*?bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
    if (!match) {
        throw new Error(`No picker cell with accessibility label "${label}"`);
    }

    const left = Number(match[1]);
    const top = Number(match[2]);
    const right = Number(match[3]);
    const bottom = Number(match[4]);
    execSync(`adb -s ${serial} shell input tap ${Math.round((left + right) / 2)} ${Math.round((top + bottom) / 2)}`);
};

describe('Interactive Dialog - date and datetime elements', () => {
    let testChannel: any;
    let testUser: any;
    let deviceTimezone: string;

    beforeAll(async () => {
        const {channel, user} = await Setup.apiInit(siteOneUrl);
        testChannel = channel;
        testUser = user;

        await User.apiAdminLogin(siteOneUrl);

        const commandResult = await Command.apiCreateCommand(siteOneUrl, {
            team_id: testChannel.team_id,
            method: 'P',
            trigger: DIALOG_TRIGGER,
            url: `${webhookBaseUrl}/datetime_dialog_request`,
            display_name: 'Datetime Dialog',
            auto_complete: false,
        });
        if (commandResult.error) {
            throw new Error(`Failed to create slash command: ${JSON.stringify(commandResult.error)}`);
        }

        // Leave the user without a resolvable timezone so the date fields exercise the
        // device-local fallback. useAutomaticTimezone must be false, otherwise the app
        // pushes the device timezone into the profile on login (autoUpdateTimezone) and
        // the fallback path is never taken.
        const patchResult = await User.apiPatchUser(siteOneUrl, testUser.id, {
            timezone: {
                useAutomaticTimezone: 'false',
                automaticTimezone: '',
                manualTimezone: '',
            },
        });
        if (patchResult.error) {
            throw new Error(`Failed to clear user timezone: ${JSON.stringify(patchResult.error)}`);
        }

        await Command.waitForSlashCommandTrigger(siteOneUrl, testChannel.team_id, DIALOG_TRIGGER, {timeoutMs: 60000});

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
        await ChannelListScreen.toBeVisible();
        await ChannelScreen.open(channelsCategory, testChannel.name);

        deviceTimezone = readDeviceTimezone();
    });

    afterAll(async () => {
        try {
            await HomeScreen.logout();
        } catch {
            // best-effort logout so later specs on this shard start clean
        }
    });

    beforeEach(async () => {
        await ChannelScreen.postSlashCommand(`/${DIALOG_TRIGGER}`);
        await InteractiveDialogScreen.toBeVisible();
        await wait(timeouts.ONE_SEC);
    });

    afterEach(async () => {
        await InteractiveDialogScreen.cancel();
        try {
            await waitFor(ChannelScreen.postInput).toBeVisible().withTimeout(timeouts.TEN_SEC);
        } catch {
            await ChannelListScreen.toBeVisible();
            await ChannelScreen.open(channelsCategory, testChannel.name);
        }
    });

    it('MM-T5900_1 should render a date default on the day it names', async () => {
        // * Both date fields default to 2026-06-15, so that day is rendered twice.
        await expect(element(by.text(DEFAULT_DAY)).atIndex(1)).toExist();
        await expect(element(by.text(datetimeLabel(deviceTimezone)))).toExist();

        // * No field may render the day before. This is the assertion that catches a date
        // formatted in the wrong zone, and it holds at any device timezone: the location
        // field's midnight in UTC+14 is 10:00 the previous day in UTC, so rendering it
        // anywhere other than its own zone yields Jun 14.
        await expect(element(by.text(DAY_BEFORE_DEFAULT))).not.toExist();
    });

    it('MM-T5900_2 should display the day the user picked, not the day before', async () => {
        if (!isAndroid()) {
            // Driving the picker here needs the adb helper below. The equivalent iOS flow
            // would use Detox's setDatePickerDate against the wheel; MM-T5900_1 already
            // covers the same rendering path on iOS without touching a picker.
            return;
        }

        // # Open the location-timezone date picker and pick 20 June 2026
        await element(by.id('AppFormElement.date_field_tz.select.button')).tap();
        await wait(timeouts.ONE_SEC);
        tapPickerCellByLabel(PICK_DAY_DESC);
        await wait(timeouts.HALF_SEC);
        await element(by.text(OK)).tap();
        await wait(timeouts.ONE_SEC);

        // * The field shows the picked day. Rendering the stored date outside the field's
        // own UTC+14 zone drops it to Jun 19, independently of the device timezone.
        await expect(element(by.text(PICKED_DAY))).toExist();
        await expect(element(by.text(DAY_BEFORE_PICKED))).not.toExist();
    });

    it('MM-T5900_3 should honor a 10-minute interval instead of snapping to 30', async () => {
        if (!isAndroid()) {
            // iOS renders a spinner that only offers valid increments, so there is no
            // snapping behaviour to assert.
            return;
        }

        // # Open the time picker, switch the dial to minutes, and pick minute 20
        await element(by.id('AppFormElement.datetime_field.time.button')).tap();
        await wait(timeouts.ONE_SEC);
        await element(by.text('00')).tap();
        await wait(timeouts.HALF_SEC);
        tapPickerCellByLabel('20');
        await wait(timeouts.HALF_SEC);
        await element(by.text(OK)).tap();
        await wait(timeouts.ONE_SEC);

        // * 20 is a multiple of the configured 10-minute interval, so it survives.
        // With the interval forced to 30 the picker snaps it to :30.
        await expect(element(by.text(datetimeLabel(deviceTimezone, 20)))).toExist();
        await expect(element(by.text(datetimeLabel(deviceTimezone, 30)))).not.toExist();
    });
});
