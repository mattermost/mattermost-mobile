// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RemoveButton from './remove_button';

import type {Database} from '@nozbe/watermelondb';

describe('RemoveButton', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('User Interaction', () => {
        it('should call onPress when user taps the button', () => {
            const onPress = jest.fn();

            const {getByTestId} = renderWithEverything(
                <RemoveButton onPress={onPress}/>,
                {database},
            );

            const button = getByTestId('remove-button');
            fireEvent.press(button);

            expect(onPress).toHaveBeenCalledTimes(1);
        });

        it('should render real close-circle icon and be interactive', () => {
            const onPress = jest.fn();

            const {getByTestId} = renderWithEverything(
                <RemoveButton onPress={onPress}/>,
                {database},
            );

            const button = getByTestId('remove-button');
            expect(button).toBeTruthy();

            fireEvent.press(button);
            expect(onPress).toHaveBeenCalledTimes(1);

            // Rapid presses are prevented (double-tap protection)
            fireEvent.press(button);
            fireEvent.press(button);
            expect(onPress).toHaveBeenCalledTimes(1);
        });

        it('should work with custom testID for user identification', () => {
            const onPress = jest.fn();

            const {getByTestId} = renderWithEverything(
                <RemoveButton
                    onPress={onPress}
                    testID='custom-remove-btn'
                />,
                {database},
            );

            const button = getByTestId('custom-remove-btn');
            fireEvent.press(button);

            expect(onPress).toHaveBeenCalledTimes(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing onPress gracefully', () => {
            // This should not crash even without onPress
            expect(() => {
                renderWithEverything(
                    <RemoveButton onPress={undefined as unknown as () => void}/>,
                    {database},
                );
            }).not.toThrow();
        });

        it('should prevent rapid successive taps (double-tap protection)', () => {
            const onPress = jest.fn();

            const {getByTestId} = renderWithEverything(
                <RemoveButton onPress={onPress}/>,
                {database},
            );

            const button = getByTestId('remove-button');

            // Rapid fire presses should be coalesced into a single call
            fireEvent.press(button);
            fireEvent.press(button);
            fireEvent.press(button);
            fireEvent.press(button);

            expect(onPress).toHaveBeenCalledTimes(1);
        });
    });
});
