// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {timeouts} from '@support/utils';

class ReportProblemScreen {
    testID = {
        reportProblemScreen: 'ReportProblem',
        enableLogAttachmentsToggleOff: 'report_problem.enable_log_attachments.toggled.false.button',
        enableLogAttachmentsToggleOn: 'report_problem.enable_log_attachments.toggled.true.button',
        closeButton: 'close-report-problem',
    };

    reportProblemScreen = element(by.id(this.testID.reportProblemScreen));
    enableLogAttachmentsToggleOff = element(by.id(this.testID.enableLogAttachmentsToggleOff));
    enableLogAttachmentsToggleOn = element(by.id(this.testID.enableLogAttachmentsToggleOn));
    closeButton = element(by.id(this.testID.closeButton));

    toBeVisible = async () => {
        await waitFor(this.reportProblemScreen).toExist().withTimeout(timeouts.TEN_SEC);

        return this.reportProblemScreen;
    };

    open = async () => {
        await SettingsScreen.reportProblemOption.tap();

        return this.toBeVisible();
    };

    close = async () => {
        await this.closeButton.tap();
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
