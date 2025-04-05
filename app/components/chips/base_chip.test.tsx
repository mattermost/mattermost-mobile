// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import BaseChip from './base_chip';

describe('BaseChip', () => {
    const onPressMock = jest.fn();

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

    it('should render with the X button when showRemoveOption is true', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                showRemoveOption={true}
            />,
        );

        expect(getByTestId('base_chip.remove.button')).toBeTruthy();
    });

    it('should not render the X button when showRemoveOption is false', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                showRemoveOption={false}
            />,
        );

        expect(queryByTestId('base_chip.remove.button')).toBeNull();
    });

    it('should call onPress when the X button is pressed', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                showRemoveOption={true}
            />,
        );

        fireEvent.press(getByTestId('base_chip.remove.button'));
        expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should call onPress when the chip is pressed without X button', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <BaseChip
                onPress={onPressMock}
                label='Test Label'
                testID='base_chip'
                showRemoveOption={false}
            />,
        );

        fireEvent.press(getByTestId('base_chip.chip_button'));
        expect(onPressMock).toHaveBeenCalledTimes(1);
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
});
