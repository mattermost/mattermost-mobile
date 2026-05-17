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

    // expo-router native stack screen — the custom NavigationHeader's
    // 'navigation.header.back' testID is not rendered here. iOS uses
    // `accessibilityLabel="Back"`, Android uses the Toolbar's default
    // navigation-icon contentDescription "Navigate up".
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
        // Use platform-native back chevron: Android via device.pressBack(),
        // iOS via by.label('Back'). The custom NavigationHeader's testID
        // does not exist on this screen (expo-router native stack).
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
