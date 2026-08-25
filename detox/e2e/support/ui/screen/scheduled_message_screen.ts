// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {User} from '@support/server_api';
import {Alert} from '@support/ui/component';
import {isIos, timeouts, wait} from '@support/utils';
import {expect, waitFor} from 'detox';

class ScheduledMessageScreen {
    testID = {
        customDateTimePickerScreen: 'custom_date_time_picker',
        deleteDraft: 'delete_draft',
        rescheduleOption: 'rescheduled_draft',
        scheduledTab: 'tabs.scheduled_posts.button',
        scheduledTabBadgeCount: 'tabs.scheduled_posts.badge',
        scheduledMessageTooltipCloseButton: 'draft.tooltip.close.button',
        scheduledMessageText: 'markdown_paragraph',
        scheduledDraftTime: 'scheduled_post_header.scheduled_at',
    };

    selectDateButton = element(by.text(isIos()? 'Select Date': 'SELECT DATE'));
    selectTimeButton = element(by.text(isIos()? 'Select Time': 'SELECT TIME'));
    saveButton = element(by.text(isIos()? 'Save': 'SAVE'));
    androidCalenderOkButton = element(by.text('OK'));
    scheduledDraftTime = element(by.id(this.testID.scheduledDraftTime));
    customDateTimePickerScreen = element(by.id(this.testID.customDateTimePickerScreen));
    rescheduleOption = element(by.id(this.testID.rescheduleOption));
    deleteDraftSwipeAction = element(by.text('Delete draft'));
    scheduledMessageText = element(by.id(this.testID.scheduledMessageText));
    deleteDraft = element(by.id(this.testID.deleteDraft));

    scheduledMessageTooltipCloseButton = {
        tap: async () => {
            await element(by.id(this.testID.scheduledMessageTooltipCloseButton)).tap();
        },
    };

    clickScheduledTab = async () => {
        await element(by.id(this.testID.scheduledTab)).tap();
        try {
            await this.scheduledMessageTooltipCloseButton.tap();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('Element not visible, skipping click');
        }
    };

    verifyCountOnScheduledTab = async (count: string) => {
        await expect(element(by.id(this.testID.scheduledTabBadgeCount))).toHaveText(count);
    };

    assertScheduledMessageExists = async (scheduledMessageText: string) => {
        await waitFor(this.scheduledMessageText).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        await expect(element(by.text(scheduledMessageText))).toBeVisible();
    };

    deleteDraftPost = async (deleteAction: any) => {
        await expect(deleteAction).toBeVisible();
        await deleteAction.tap();
        await waitFor(Alert.deleteScheduledMessageButton).toExist().withTimeout(timeouts.TEN_SEC);
        await Alert.deleteScheduledMessageButton.tap();
    };

    deleteDraftPostFromSwipeActions = async () => {
        await this.deleteDraftPost(this.deleteDraftSwipeAction);
    };

    deleteScheduledMessageFromDraftActions = async () => {
        await this.deleteDraftPost(this.deleteDraft);
    };

    // The spinner is a UIDatePicker on most iOS versions and a UIPickerView on others.
    private nudgeIosPicker = async (): Promise<boolean> => {
        try {
            await element(by.type('UIDatePicker')).swipe('up', 'slow', 0.2);
            return true;
        } catch {
            try {
                await element(by.type('UIPickerView')).atIndex(0).swipe('up', 'slow', 0.2);
                return true;
            } catch {
                return false;
            }
        }
    };

    selectDateTime = async () => {
        // Save stays disabled until handleChange fires with a time ≠ scheduledAt.
        // Tapping Select Date/Time alone does not change the value — nudge the
        // iOS spinner so onChange runs (MM-T5720).
        await this.selectTimeButton.tap();
        if (isIos()) {
            const saveButton = element(by.id('reschedule_draft.save.button'));
            await waitFor(saveButton).toExist().withTimeout(timeouts.FIVE_SEC);

            // Nudge FIRST, every time, and never gate on the button's `enabled` attribute.
            // reschedule_draft.save.button is a Pressable whose disabled state is only a
            // 0.32-opacity text colour, and Detox read it back as enabled while it was
            // visibly greyed out: iOS shard 12 of run 32881947481 shows one getAttributes
            // call, zero picker swipes, and then a Save tap — so the guard skipped the very
            // nudge it existed to drive, selectedTime still equalled draft.scheduledAt,
            // canSave stayed false and both Save taps were no-ops against a disabled
            // Pressable. testFnFailure.png is the picker still up with Save greyed.
            //
            // The app's real precondition is "the picked time differs from scheduledAt",
            // and only a swipe produces that, so swipe then tap, and take the picker going
            // away as the only proof the save committed.
            /* eslint-disable no-await-in-loop -- swipe the spinner until the save commits */
            for (let attempt = 0; attempt < 4; attempt++) {
                if (!await this.nudgeIosPicker()) {
                    throw new Error('ScheduleMessageScreen.selectDateTime: no iOS date picker was available to swipe');
                }
                await wait(timeouts.HALF_SEC);
                await saveButton.tap();
                try {
                    await waitFor(this.customDateTimePickerScreen).not.toExist().withTimeout(timeouts.FIVE_SEC);
                    return;
                } catch {
                    // Still on the picker: the swipe either landed back on the original
                    // time or canSave was still being recomputed. Swipe again.
                }
            }
            /* eslint-enable no-await-in-loop */

            throw new Error('ScheduleMessageScreen.selectDateTime: the picker was still on screen after 4 swipe-and-save attempts, so the new time never committed');
        }
        await this.selectDateButton.tap();
        await this.selectTimeButton.tap();
        await this.saveButton.tap();
    };

    clickRescheduleOption = async () => {
        await this.rescheduleOption.tap();
        if (isIos()) {
            await waitFor(this.customDateTimePickerScreen).toBeVisible().withTimeout(timeouts.FOUR_SEC);
            await expect(this.customDateTimePickerScreen).toBeVisible();
        } else {
            // to close native calander picker
            await device.pressBack();
        }
    };

    /**
     * Asserts that the element has the expected text.
     * @param expectedText - The text you expect in the element
     */
    assertScheduleTimeTextIsVisible = async (expectedText: string) => {
        const expected = this.normalize(expectedText);
        let actualText = '';

        await waitFor(this.scheduledDraftTime).toBeVisible().withTimeout(timeouts.FIVE_SEC);
        const deadline = Date.now() + timeouts.TWENTY_SEC;
        /* eslint-disable no-await-in-loop */
        while (Date.now() < deadline) {
            const attr = await this.scheduledDraftTime.getAttributes();
            actualText = this.normalize(('text' in attr ? attr.text : null) ?? '');
            if (actualText === expected) {
                return;
            }
            await wait(timeouts.HALF_SEC);
        }
        /* eslint-enable no-await-in-loop */

        throw new Error(`Expected text "${expectedText}" but found "${actualText}"`);
    };

    getRoundedTime = async (): Promise<Date> => {
        const now = new Date();
        const minutes = now.getMinutes();

        if (minutes === 0 || minutes === 30) {
            // Waiting 60 seconds to avoid edge case at HH:00 or HH:30...
            await wait(timeouts.ONE_MIN);
            return this.getRoundedTime(); // Retry after wait
        }

        if (minutes < 30) {
            now.setMinutes(30, 0, 0);
        } else {
            now.setHours(now.getHours() + 1, 0, 0, 0);
        }

        return now;
    };

    nextMonday = async () => {
        const {year, month, day} = this.deviceCalendarDate();
        const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
        const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7;

        return this.normalize(`Send on ${this.formatCalendarDate(year, month, day + daysUntilNextMonday)}, 9:00 AM`);
    };

    currentDay = async () => {
        const adjustedTime = await this.getRoundedTime();

        const locale = 'en-US';
        const dateOptions: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
        const timeOptions: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        };

        const datePart = adjustedTime.toLocaleDateString(locale, dateOptions);
        const timePart = adjustedTime.toLocaleTimeString(locale, timeOptions);

        return this.normalize(`Send on ${datePart}, ${timePart}`);
    };

    // The app renders these labels in the *device's* timezone; these helpers used to build
    // them from `new Date()` in the Node runner's timezone. In CI the runner is UTC and the
    // emulator is America/New_York, so between 00:00 and 04:00 UTC the two disagree on what
    // day it is: MM-T5720 on Android shard 21 (f181296) expected "Send on Aug 26, 9:00 AM"
    // at 02:53 UTC and the app correctly showed "Send on Aug 25, 9:00 AM" — the device was
    // still on Aug 24. Anchor the calendar arithmetic to the device timezone instead.
    deviceTimeZone: string | undefined = undefined;

    // The app pushes the device timezone to the server on home mount (autoUpdateTimezone),
    // so the stored user timezone is the same zone the labels are formatted in. Falls back
    // to the runner's zone, which is correct for local runs where both share a host.
    resolveDeviceTimeZone = async (baseUrl: string, userId: string) => {
        try {
            const {user} = await User.apiGetUserById(baseUrl, userId);
            const zone = user?.timezone?.automaticTimezone || user?.timezone?.manualTimezone;
            this.deviceTimeZone = zone || undefined;
        } catch {
            // Leave undefined and format in the runner's zone.
            this.deviceTimeZone = undefined;
        }
        return this.deviceTimeZone;
    };

    // Calendar date on the device, as {year, month, day}. Uses en-CA because it formats as
    // an unambiguous YYYY-MM-DD.
    private deviceCalendarDate = (at: Date = new Date()) => {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: this.deviceTimeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(at);
        const [yearPart = '', monthPart = '', dayPart = ''] = parts.split('-');
        return {year: Number(yearPart), month: Number(monthPart), day: Number(dayPart)};
    };

    // Formats a device-local calendar date as "Mon D". Built on a UTC instant so the
    // formatter cannot shift the day back across a zone boundary.
    private formatCalendarDate = (year: number, month: number, day: number) => {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC',
            month: 'short',
            day: 'numeric',
        }).format(new Date(Date.UTC(year, month - 1, day)));
    };

    tomorrowAtNineAm = () => {
        const {year, month, day} = this.deviceCalendarDate();
        return this.normalize(`Send on ${this.formatCalendarDate(year, month, day + 1)}, 9:00 AM`);
    };

    expectedLabelForScheduleOption = async (option: 'tomorrow' | 'next_monday' | 'monday') => {
        if (option === 'tomorrow') {
            return this.tomorrowAtNineAm();
        }
        return this.nextMonday();
    };

    /**
     * Normalizes text by trimming, collapsing spaces, and replacing narrow no-break spaces.
     */
    normalize = (s: string) =>
        s.replace(/\u202F/g, ' '). // replace narrow no-break spaces
            replace(/\s+/g, ' '). // collapse multiple spaces
            trim();

}

const scheduledMessageScreen = new ScheduledMessageScreen();
export default scheduledMessageScreen;
