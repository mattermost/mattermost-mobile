// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from '@support/ui/component';
import {timeouts} from '@support/utils';
import {expect} from 'detox';

class ScheduledMessageScreen {
    testID = {
        customDateTimePickerScreen: 'custom_date_time_picker',
        deleteDraft: 'delete_draft',
        rescheduleOption: 'rescheduled_draft',
        scheduledTab: 'scheduled_post_tab',
        scheduledTabBadgeCount: 'scheduled_post_count_badge',
        scheduledMessageTooltipCloseButton: 'draft.tooltip.close.button',
        scheduledMessageText: 'markdown_paragraph',
    };

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
        await waitFor(this.scheduledMessageText).toBeVisible().withTimeout(500);
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

    clickRescheduleOption = async () => {
        await this.rescheduleOption.tap();
        await waitFor(this.customDateTimePickerScreen).toBeVisible().withTimeout(timeouts.FOUR_SEC);
        await expect(this.customDateTimePickerScreen).toBeVisible();
    };

    selectDateTime = async () => {
        await element(by.text('Select Date')).tap();
        await element(by.text('Select Time')).tap();
        await element(by.text('Save')).tap();
    };

    assertScheduleTimeTextIsVisible = async (time: string) => {
        await waitFor(element(by.id('scheduled_post_header.scheduled_at'))).toBeVisible().withTimeout(timeouts.TEN_SEC);
        await expect(element(by.id('scheduled_post_header.scheduled_at'))).toHaveText(time);
    };

    nextMonday = async () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7;
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilNextMonday);
        nextMonday.setHours(9, 0, 0, 0);

        const options: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
        const formattedDate = `${nextMonday.toLocaleDateString('en-US', options)}, 9:00 AM`;
        return formattedDate;
    };

    currentDay = async () => {
        const today = new Date();
        today.setHours(9, 0, 0, 0);

        const options: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
        const formattedDate = `${today.toLocaleDateString('en-US', options)}, 9:00 AM`;
        return formattedDate;
    };
}

const scheduledMessageScreen = new ScheduledMessageScreen();
export default scheduledMessageScreen;
