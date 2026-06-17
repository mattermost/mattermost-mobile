// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SettingsScreen} from '@support/ui/screen';
import {isIos, tapNativeBackButton, timeouts} from '@support/utils';

class ReportProblemScreen {
    testID = {
        reportProblemScreen: 'report_problem.screen',
        backButton: 'navigation.header.back',
        enableLogAttachmentsToggleOff: 'report_problem.enable_log_attachments.toggled.false.button',
        enableLogAttachmentsToggleOn: 'report_problem.enable_log_attachments.toggled.true.button',
    };

    reportProblemScreen = element(by.id(this.testID.reportProblemScreen));

    // Native-stack back chevron via accessibility label.
    get backButton(): Detox.NativeElement {
        return isIos()
            ? element(by.label('Back')).atIndex(0)
            : element(by.label('Navigate up')).atIndex(0);
    }

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
        // Native-stack back chevron.
        await tapNativeBackButton();
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
