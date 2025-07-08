// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {renderWithIntl} from '@test/intl-test-helper';
import {changeOpacity} from '@utils/theme';

import Checkbox from './checkbox';

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(),
}));
jest.mocked(useTheme).mockReturnValue(Preferences.THEMES.denim);

describe('Checkbox', () => {
    const mockOnPress = jest.fn();

    it('renders unchecked checkbox', () => {
        const {queryByTestId} = renderWithIntl(
            <Checkbox
                checked={false}
                onPress={mockOnPress}
            />,
        );

        expect(queryByTestId('check-icon')).toBeNull();
    });

    it('renders checked checkbox with check icon', () => {
        const {getByTestId} = renderWithIntl(
            <Checkbox
                checked={true}
                onPress={mockOnPress}
            />,
        );

        expect(getByTestId('check-icon')).toBeVisible();
    });

    it('calls onPress when pressed', () => {
        const {root} = renderWithIntl(
            <Checkbox
                checked={false}
                onPress={mockOnPress}
            />,
        );

        act(() => {
            fireEvent.press(root);
        });

        expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress twice double tapped', () => {
        jest.useFakeTimers();
        const {root} = renderWithIntl(
            <Checkbox
                checked={false}
                onPress={mockOnPress}
            />,
        );

        // First tap
        act(() => {
            fireEvent.press(root);
        });

        expect(mockOnPress).toHaveBeenCalledTimes(1);
        mockOnPress.mockClear();

        // Advance timer a short time
        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Second tap
        act(() => {
            fireEvent.press(root);
        });

        expect(mockOnPress).toHaveBeenCalledTimes(0);

        // Advance timer 1 second
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        // No calls generated
        expect(mockOnPress).toHaveBeenCalledTimes(0);

        // Last tap
        act(() => {
            fireEvent.press(root);
        });

        expect(mockOnPress).toHaveBeenCalledTimes(1);

        jest.useRealTimers();
    });

    it('does not call onPress when disabled', () => {
        const {root} = renderWithIntl(
            <Checkbox
                checked={false}
                onPress={mockOnPress}
                disabled={true}
            />,
        );

        act(() => {
            fireEvent.press(root);
        });

        expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('applies the correct styles', () => {
        const {getByTestId, root, rerender} = renderWithIntl(
            <Checkbox
                checked={false}
                onPress={mockOnPress}
                disabled={false}
            />,
        );

        expect(root).toHaveStyle({
            borderColor: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.24),
        });

        rerender(
            <Checkbox
                checked={true}
                onPress={mockOnPress}
                disabled={false}
            />,
        );

        const checkbox = getByTestId('check-icon');
        expect(root).toHaveStyle({
            borderColor: Preferences.THEMES.denim.buttonBg,
        });
        expect(checkbox).toHaveStyle({
            color: Preferences.THEMES.denim.buttonColor,
        });
        rerender(
            <Checkbox
                checked={true}
                onPress={mockOnPress}
                disabled={true}
            />,
        );

        expect(root).toHaveStyle({
            borderColor: changeOpacity(Preferences.THEMES.denim.centerChannelColor, 0.12),
        });
        expect(checkbox).toHaveStyle({
            color: Preferences.THEMES.denim.centerChannelColor,
        });
    });
});
