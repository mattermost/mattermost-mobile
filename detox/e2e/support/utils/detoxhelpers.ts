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

/**
 * Safely dismiss keyboard with retry logic
 * Prevents keyboard input session invalidation errors
 * @param maxAttempts - Maximum number of dismissal attempts
 */
export async function dismissKeyboardSafely(maxAttempts = 3): Promise<void> {
    /* eslint-disable no-await-in-loop, no-console */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await device.pressBack(); // Works on both iOS (dismisses keyboard) and Android
            // Wait a bit for keyboard to dismiss
            await new Promise((resolve) => setTimeout(resolve, 300));
            return;
        } catch (error) {
            if (attempt === maxAttempts) {
                // On final attempt, log warning but don't throw to prevent test failures
                console.warn(`[dismissKeyboardSafely] Failed to dismiss keyboard after ${maxAttempts} attempts:`, error);
            } else {
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }
    }
    /* eslint-enable no-await-in-loop, no-console */
}

/**
 * Perform text input with keyboard state verification
 * Ensures text input session is valid before typing
 * @param element - Detox element to type into
 * @param text - Text to type
 */
export async function typeTextSafely(elementToType: Detox.IndexableNativeElement, text: string): Promise<void> {
    try {
        // Tap element to ensure it's focused
        await elementToType.tap();
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Type text
        await elementToType.typeText(text);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[typeTextSafely] Text input failed, retrying:', error);

        // Retry once with dismissal and refocus
        await dismissKeyboardSafely();
        await new Promise((resolve) => setTimeout(resolve, 500));
        await elementToType.tap();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await elementToType.typeText(text);
    }
}

/**
 * Retry an element visibility check with exponential backoff
 * Helps handle race conditions during navigation and UI transitions
 * @param elementToCheck - Detox element to check visibility
 * @param timeout - Timeout for each attempt in milliseconds
 * @param maxAttempts - Maximum number of retry attempts
 */
export async function waitForVisibilityWithRetry(
    elementToCheck: Detox.NativeElement,
    timeout = 10000,
    maxAttempts = 3,
): Promise<void> {
    /* eslint-disable no-await-in-loop, no-console */
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await waitFor(elementToCheck).toBeVisible().withTimeout(timeout);
            return;
        } catch (error) {
            if (attempt === maxAttempts) {
                throw error;
            }

            console.warn(`[waitForVisibilityWithRetry] Attempt ${attempt}/${maxAttempts} failed, retrying...`);

            // Exponential backoff: 1s, 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
    }
    /* eslint-enable no-await-in-loop, no-console */
}
