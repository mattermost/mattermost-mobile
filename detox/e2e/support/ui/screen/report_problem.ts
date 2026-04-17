// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';

class ReportProblemScreen {
    testID = {
        reportProblemScreen: 'report_problem.screen',
        backButton: 'screen.back.button',
        enableLogAttachmentsToggleOff: 'report_problem.enable_log_attachments.toggled.false.button',
        enableLogAttachmentsToggleOn: 'report_problem.enable_log_attachments.toggled.true.button',
    };

    reportProblemScreen = element(by.id(this.testID.reportProblemScreen));
    backButton = element(by.id(this.testID.backButton));
    enableLogAttachmentsToggleOff = element(by.id(this.testID.enableLogAttachmentsToggleOff));
    enableLogAttachmentsToggleOn = element(by.id(this.testID.enableLogAttachmentsToggleOn));

    toBeVisible = async () => {
        await waitFor(this.reportProblemScreen).toBeVisible().withTimeout(timeouts.TEN_SEC);

        return this.reportProblemScreen;
    };

    open = async () => {
        await SettingsScreen.reportProblemOption.tap();

        return this.toBeVisible();
    };

    back = async () => {
        await this.backButton.tap();
        await waitFor(this.reportProblemScreen).not.toBeVisible().withTimeout(timeouts.TEN_SEC);
    };

    enableAttachLogs = async () => {
        await waitFor(this.enableLogAttachmentsToggleOff).toExist().withTimeout(timeouts.FOUR_SEC);
        await this.enableLogAttachmentsToggleOff.tap();
        await waitFor(this.enableLogAttachmentsToggleOn).toExist().withTimeout(timeouts.FOUR_SEC);
    };

    disableAttachLogs = async () => {
        await waitFor(this.enableLogAttachmentsToggleOn).toExist().withTimeout(timeouts.FOUR_SEC);
        await this.enableLogAttachmentsToggleOn.tap();
        await waitFor(this.enableLogAttachmentsToggleOff).toExist().withTimeout(timeouts.FOUR_SEC);
    };
}

const reportProblemScreen = new ReportProblemScreen();
export default reportProblemScreen;
