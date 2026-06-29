// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

    selectDateTime = async () => {
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
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7;

        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilNextMonday);
        nextMonday.setHours(9, 0, 0, 0); // Hardcoded 9:00 AM

        const locale = 'en-US';
        const dateOptions: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
        const timeOptions: Intl.DateTimeFormatOptions = {hour: 'numeric', minute: '2-digit', hour12: true};

        const datePart = nextMonday.toLocaleDateString(locale, dateOptions);
        const timePart = nextMonday.toLocaleTimeString(locale, timeOptions);

        return this.normalize(`Send on ${datePart}, ${timePart}`);
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

    tomorrowAtNineAm = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        const locale = 'en-US';
        const dateOptions: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
        const timeOptions: Intl.DateTimeFormatOptions = {hour: 'numeric', minute: '2-digit', hour12: true};

        const datePart = tomorrow.toLocaleDateString(locale, dateOptions);
        const timePart = tomorrow.toLocaleTimeString(locale, timeOptions);

        return this.normalize(`Send on ${datePart}, ${timePart}`);
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
