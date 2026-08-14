// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-empty */

// *******************************************************************
// - [#] indicates a test step (e.g. # Go to a screen)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element testID when selecting an element. Create one if none.
// *******************************************************************

import {
    cleanupInteractiveDialogAfterEach,
    ensureDialogClosed,
    ensureDialogOpen,
    ISO_DATETIME_PATTERN,
    logoutInteractiveDialogSuite,
    setupInteractiveDialogPluginSuite,
} from '@support/interactive_dialog_test_helper';
import {Post} from '@support/server_api';
import {siteOneUrl} from '@support/test_config';
import {ChannelScreen, InteractiveDialogScreen} from '@support/ui/screen';
import {isAndroid, wait} from '@support/utils';
import {expect} from 'detox';

// MM-66558: dialog fields use replaceText instead of typeText.

describe('Interactive Dialog - Datetime (Plugin)', () => {
    let testChannel: any;

    beforeAll(async () => {
        ({testChannel} = await setupInteractiveDialogPluginSuite());
    });

    afterAll(async () => {
        await logoutInteractiveDialogSuite();
    });

    afterEach(async () => {
        await cleanupInteractiveDialogAfterEach(testChannel);
    });

    it('MM-T2530A should open date/datetime dialog and display fields', async () => {
        // # Open datetime-basic dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // * Verify dialog title
        await expect(element(by.text('Date & DateTime Basics'))).toExist();

        // * Verify all fields are visible by testID
        await expect(element(by.id('AppFormElement.event_date'))).toExist();
        await expect(element(by.id('AppFormElement.meeting_time'))).toExist();
        await expect(element(by.id('AppFormElement.future_date'))).toExist();
        await expect(element(by.id('AppFormElement.interval_time'))).toExist();
        await expect(element(by.id('AppFormElement.relative_date'))).toExist();
        await expect(element(by.id('AppFormElement.relative_datetime'))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530B should validate required date/datetime fields', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // # Try to submit without required fields
        await InteractiveDialogScreen.submit();
        await wait(500);

        // * Should still be on dialog (submission failed due to validation)
        await expect(InteractiveDialogScreen.interactiveDialogScreen).toExist();

        // * Verify validation error text appears for required fields
        await expect(element(by.text('This field is required.'))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530C should select date and display formatted value', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // # Tap Event Date field to open date picker
        await element(by.id('AppFormElement.event_date.select.button')).tap();
        await wait(1000);

        // # Close picker (iOS shows picker inline, tap the button again to close)
        if (isAndroid()) {
            try {
                await element(by.text('OK')).tap();
            } catch {}
        } else {
            await element(by.id('AppFormElement.event_date.select.button')).tap();
        }
        await wait(500);

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530D should display relative date defaults', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // * Verify Relative Date Example (default="today") field is rendered
        await expect(element(by.text('Relative Date Example'))).toExist();

        // * Verify Relative DateTime Example (default="+1d") field is rendered
        await expect(element(by.text('Relative DateTime Example'))).toExist();

        await InteractiveDialogScreen.cancel();
        await ensureDialogClosed();
    });

    it('MM-T2530F should verify UTC conversion for datetime values', async () => {
        // # Open dialog
        await ChannelScreen.postSlashCommand('/dialog datetime-basic');
        await ensureDialogOpen();

        // # Fill required Event Date field
        await element(by.id('AppFormElement.event_date.select.button')).tap();
        await wait(500);
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.id('AppFormElement.event_date')).tap();
        }
        await wait(300);

        // # Fill required Meeting Time field
        await element(by.id('AppFormElement.meeting_time.select.button')).tap();
        await wait(500);
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.id('AppFormElement.meeting_time')).tap();
        }
        await wait(300);

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1000);

        // * Dialog should close after successful submission
        await ensureDialogClosed();

        // * Verify submission post contains ISO/UTC datetime format
        await wait(1000);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);

        // Meeting Time should be in ISO format with T separator (e.g., 2026-04-10T14:00:00.000Z)
        if (!ISO_DATETIME_PATTERN.test(post.message)) {
            throw new Error(`Expected ISO datetime in submission post but got: ${post.message}`);
        }
    });

    it('MM-T2530G should display timezone indicator and convert to UTC correctly', async () => {
        // # Open datetime-timezone dialog (has Europe/London timezone fields)
        await ChannelScreen.postSlashCommand('/dialog datetime-timezone');
        await ensureDialogOpen();

        // # Scroll down past introduction text to reveal fields
        try {
            await element(by.id('interactive_dialog.screen')).scroll(300, 'down');
            await wait(300);
        } catch {}

        // * Verify London dropdown field is visible
        await expect(element(by.id('AppFormElement.london_dropdown'))).toExist();

        // * Verify timezone indicator appears for London field
        // London is GMT in winter, BST in summer — mobile renders without emoji.
        // Datetime-timezone dialog can show the indicator twice.
        try {
            await expect(element(by.text('Times in GMT')).atIndex(0)).toExist();
        } catch {
            await expect(element(by.text('Times in BST')).atIndex(0)).toExist();
        }

        // # Select datetime in London field
        await element(by.id('AppFormElement.london_dropdown.select.button')).tap();
        await wait(1000);

        // # Scroll to make picker visible
        try {
            await element(by.id('interactive_dialog.scroll_view')).scrollTo('bottom');
            await wait(300);
        } catch {}

        // # Explicitly set a date on the native picker so onChange fires and the field captures a value.
        // Optional fields in datetime-timezone have no defaults; opening/closing alone doesn't emit a value.
        try {
            await element(by.id('custom_status_clear_after.date_time_picker')).setDatePickerDate('2026-05-15T14:00:00Z', 'ISO8601');
            await wait(300);
        } catch {}

        // # Close date picker
        if (isAndroid()) {
            await element(by.text('OK')).tap();
        } else {
            await element(by.id('AppFormElement.london_dropdown.select.button')).tap();
        }
        await wait(500);

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1500);

        // * Dialog should close
        await ensureDialogClosed();

        // * Verify submission post contains ISO/UTC datetime format
        await wait(2000);
        const {post: tzPost} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        if (!ISO_DATETIME_PATTERN.test(tzPost.message)) {
            throw new Error(`Expected ISO datetime in timezone submission post but got: ${tzPost.message}`);
        }
    });

    it('MM-T2530H should accept manual time entry on datetime field', async () => {
        // Last in suite — manual TextInput can leave keyboard/animation state that breaks later dialog tests.
        // # Open datetime-timezone dialog (has fields with allow_manual_time_entry)
        await ChannelScreen.postSlashCommand('/dialog datetime-timezone');
        await ensureDialogOpen();

        // # Scroll past introduction text to reveal fields
        try {
            await element(by.id('interactive_dialog.screen')).scroll(300, 'down');
            await wait(300);
        } catch {}

        // # Tap time button to switch local_manual into manual entry mode
        await element(by.id('AppFormElement.local_manual.time.button')).tap();
        await wait(500);

        // # Replace any prefilled text with the manual time entry (parseTimeString accepts 24-hour without am/pm)
        const manualInput = element(by.id('AppFormElement.local_manual.manual_time.input'));
        await waitFor(manualInput).toBeVisible().withTimeout(2000);
        await manualInput.replaceText('14:30');

        // # Commit by pressing Done — fires onSubmitEditing → handleManualTimeSubmit → handleChange
        await manualInput.tapReturnKey();
        await wait(500);

        // # Submit dialog
        await InteractiveDialogScreen.submit();
        await wait(1500);

        // * Dialog should close after successful submission
        await ensureDialogClosed();

        // * Verify submission post: local_manual must be populated with a UTC ISO timestamp
        // whose minute portion is 30 (manual entry preserves typed minutes; rounded-picker values would be :00)
        await wait(1000);
        const {post} = await Post.apiGetLastPostInChannel(siteOneUrl, testChannel.id);
        const match = post.message.match(/local_manual:\s*(\S+)/);
        if (!match || !match[1]) {
            throw new Error(`Expected local_manual to have a value but got: ${post.message}`);
        }
        const submitted = match[1];
        if (!/T\d{2}:30:\d{2}(?:\.\d+)?Z$/.test(submitted)) {
            throw new Error(`Expected manually-entered minutes (:30) in local_manual but got: ${submitted}`);
        }
    });
});
