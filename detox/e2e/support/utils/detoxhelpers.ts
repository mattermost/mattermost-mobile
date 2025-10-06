// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {by, element, waitFor} from 'detox';

export async function waitForPartialText(text: string, timeout = 10000): Promise<void> {
    // Detox does not support partial text matching directly; use exact match or implement a workaround.
    await waitFor(element(by.text(new RegExp(text, 'i')))).toBeVisible().withTimeout(timeout);
}

export async function expectPartialText(text: string, timeout = 10000): Promise<void> {
    // Detox does not support partial text matching directly; use exact match or implement a workaround.
    await waitFor(element(by.text(new RegExp(text, 'i')))).toBeVisible().withTimeout(timeout);
}

export async function scrollUntilVisible(testID: string, text: string): Promise<void> {
    // Detox does not support partial text matching directly; use exact match or implement a workaround.
    await waitFor(element(by.text(new RegExp(text, 'i')))).
        toBeVisible().
        whileElement(by.id(testID)).
        scroll(100, 'down');
}

export async function waitForLoadingSpinner(testID: string, timeout = 10000): Promise<void> {
    await waitFor(element(by.id(testID))).not.toBeVisible().withTimeout(timeout);
}
