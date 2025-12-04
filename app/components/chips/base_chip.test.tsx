// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import BaseChip from './base_chip';

describe('BaseChip', () => {
    const onPressMock = jest.fn();
    const onActionPressMock = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render correctly with default props', () => {
        const {getByText} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
            />,
        );

        expect(getByText('Test Label')).toBeTruthy();
    });

    it('should render with the X button when action is remove', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                action={{icon: 'remove'}}
            />,
        );

        expect(getByTestId('base_chip.remove.icon')).toBeTruthy();
    });

    it('should render with the chevron down button when action is downArrow', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                action={{icon: 'downArrow'}}
            />,
        );

        expect(getByTestId('base_chip.downArrow.icon')).toBeTruthy();
    });

    it('should not render the action button when action is undefined', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
            />,
        );

        expect(queryByTestId('base_chip.remove.icon')).toBeNull();
        expect(queryByTestId('base_chip.downArrow.icon')).toBeNull();
    });

    it('should call onPressMock when the action button is pressed', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                action={{icon: 'remove', onPress: onActionPressMock}}
            />,
        );

        fireEvent.press(getByTestId('base_chip.remove.button'));
        expect(onPressMock).not.toHaveBeenCalled();
        expect(onActionPressMock).toHaveBeenCalledTimes(1);
    });

    it('should call onPress when the chip is pressed without action button', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
            />,
        );

        fireEvent.press(getByTestId('base_chip.chip_button'));
        expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should call onPress when the chip is pressed and we have an action button', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                action={{icon: 'remove', onPress: onActionPressMock}}
            />,
        );

        fireEvent.press(getByTestId('base_chip.chip_button'));
        expect(onPressMock).toHaveBeenCalledTimes(1);
        expect(onActionPressMock).not.toHaveBeenCalled();
    });

    it('should handle animations when showAnimation is true', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                showAnimation={true}
            />,
        );

        expect(getByTestId('base_chip').props.entering).toBeTruthy();
        expect(getByTestId('base_chip').props.exiting).toBeTruthy();
    });

    it('should not handle animations when showAnimation is false', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                showAnimation={false}
            />,
        );

        expect(getByTestId('base_chip').props.entering).toBeUndefined();
        expect(getByTestId('base_chip').props.exiting).toBeUndefined();
    });

    it('should not have a touchable if onPress is not provided', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <BaseChip
                label='Test Label'
                testID='base_chip'
            />,
        );

        expect(queryByTestId('base_chip.chip_button')).toBeNull();
    });

    it('should bold the text when boldText is true', () => {
        const {getByText, rerender} = renderWithIntlAndTheme(
            <BaseChip
                label='Test Label'
                testID='base_chip'
                boldText={true}
            />,
        );

        expect(getByText('Test Label')).toHaveStyle({fontWeight: '600'});

        rerender(
            <BaseChip
                label='Test Label'
                testID='base_chip'
                boldText={false}
            />,
        );

        expect(getByText('Test Label')).toHaveStyle({fontWeight: '400'});
    });

    it('should use the correct text color based on the type', () => {
        const {getByText, rerender} = renderWithIntlAndTheme(
            <BaseChip
                label='Test Label'
                testID='base_chip'
                type='normal'
            />,
        );

        expect(getByText('Test Label')).toHaveStyle({color: Preferences.THEMES.denim.centerChannelColor});

        rerender(
            <BaseChip
                label='Test Label'
                testID='base_chip'
                type='danger'
            />,
        );

        expect(getByText('Test Label')).toHaveStyle({color: Preferences.THEMES.denim.errorTextColor});

        rerender(
            <BaseChip
                label='Test Label'
                testID='base_chip'
                type='link'
            />,
        );

        expect(getByText('Test Label')).toHaveStyle({color: Preferences.THEMES.denim.linkColor});
    });
});
