// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Get the last call made to a Jest mock function.
 * @param mock - The Jest mock function
 * @returns The arguments array from the last call
 */
export function getLastCall<T, U extends unknown[], V>(mock: jest.Mock<T, U, V>): U {
    const allCalls = mock.mock.calls;
    return allCalls[allCalls.length - 1];
}

/**
 * Get the last call made to a Jest mock function for a specific button ID.
 * Useful for testing navigation button handlers where the first argument is the button ID.
 * @param mock - The Jest mock function
 * @param buttonId - The button ID to filter by
 * @returns The arguments array from the last call matching the button ID
 */
export function getLastCallForButton<T, U extends unknown[], V>(mock: jest.Mock<T, U, V>, buttonId: string): U {
    const allCalls = mock.mock.calls;
    const buttonCalls = allCalls.filter((call) => call[0] === buttonId);
    return buttonCalls[buttonCalls.length - 1];
}

