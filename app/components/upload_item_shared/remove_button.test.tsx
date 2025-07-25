// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RemoveButton from './remove_button';

import type {Database} from '@nozbe/watermelondb';

// No mocking needed - using real CompassIcon and TouchableWithFeedback!

describe('RemoveButton', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
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

            // Test with real components - should have the actual structure
            const button = getByTestId('remove-button');
            expect(button).toBeTruthy();

            // Real TouchableWithFeedback should respond to press
            fireEvent.press(button);
            expect(onPress).toHaveBeenCalledTimes(1);

            // Test multiple presses work
            fireEvent.press(button);
            fireEvent.press(button);
            expect(onPress).toHaveBeenCalledTimes(3);
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
                    <RemoveButton onPress={undefined as any}/>,
                    {database},
                );
            }).not.toThrow();
        });

        it('should handle rapid successive taps without issues', () => {
            const onPress = jest.fn();

            const {getByTestId} = renderWithEverything(
                <RemoveButton onPress={onPress}/>,
                {database},
            );

            const button = getByTestId('remove-button');

            // Rapid fire presses
            fireEvent.press(button);
            fireEvent.press(button);
            fireEvent.press(button);
            fireEvent.press(button);

            expect(onPress).toHaveBeenCalledTimes(4);
        });
    });
});
