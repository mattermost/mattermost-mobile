// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';

import {type NavigationButtonProps} from '@components/navigation_button';
import Footer from '@components/settings/footer';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import MmBlocksTextInput, {type MmBlocksTextInputProps} from './index';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@components/settings/footer', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockSetOptions = jest.fn();
const mockNavigation = {setOptions: mockSetOptions};

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => mockNavigation),
}));

jest.mocked(Footer).mockImplementation(
    (props) => React.createElement('Footer', {testID: 'mm_blocks_text_input.footer', ...props}),
);

const INPUT_TEST_ID = 'mm_blocks_text_input.input';

function getSaveButton() {
    const lastOptions = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    return lastOptions.headerRight() as React.ReactElement<NavigationButtonProps>;
}

function getAndroidBackHandler() {
    return jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
}

describe('MmBlocksTextInput', () => {
    const mockOnSave = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        CallbackStore.removeCallback();
    });

    function renderScreen(props: MmBlocksTextInputProps = {}) {
        return renderWithIntlAndTheme(<MmBlocksTextInput {...props}/>);
    }

    it('should render the input with the initial value and placeholder', () => {
        const {getByTestId} = renderScreen({initialValue: 'Initial text', placeholder: 'Type something'});

        const input = getByTestId(INPUT_TEST_ID);
        expect(input).toHaveProp('value', 'Initial text');
        expect(input).toHaveProp('placeholder', 'Type something');
        expect(input).toHaveProp('autoFocus', true);
    });

    it('should render an empty input when no initial value is provided', () => {
        const {getByTestId} = renderScreen();

        expect(getByTestId(INPUT_TEST_ID)).toHaveProp('value', '');
    });

    it('should mark the label as required when the field is not optional', () => {
        const {getByText} = renderScreen({label: 'Full name'});

        expect(getByText('Full name *')).toBeTruthy();
    });

    it('should mark the label as optional when the field is optional', () => {
        const {getByText} = renderScreen({label: 'Full name', optional: true});

        expect(getByText('Full name (optional)')).toBeTruthy();
    });

    it('should not render a suffix when no label is provided', () => {
        const {queryByText} = renderScreen({optional: true});

        expect(queryByText(/optional/)).toBeNull();
    });

    it('should not render a suffix when the label is only whitespace', () => {
        const {queryByText} = renderScreen({label: '   ', optional: false});

        expect(queryByText(/\*/)).toBeNull();
        expect(queryByText(/optional/)).toBeNull();
    });

    it('should update the value as the user types', () => {
        const {getByTestId} = renderScreen({initialValue: 'Initial text'});

        const input = getByTestId(INPUT_TEST_ID);
        act(() => {
            fireEvent.changeText(input, 'Edited text');
        });

        expect(input).toHaveProp('value', 'Edited text');
    });

    it('should register a save button in the navigation header', () => {
        renderScreen();

        const saveButton = getSaveButton();
        expect(saveButton.props.testID).toBe('mm_blocks.text_input.save.button');
        expect(saveButton.props.text).toBe('Save');
    });

    it('should call the stored callback with the current value and close when save is pressed', () => {
        CallbackStore.setCallback(mockOnSave);
        const {getByTestId} = renderScreen({initialValue: 'Initial text'});

        act(() => {
            fireEvent.changeText(getByTestId(INPUT_TEST_ID), 'Edited text');
        });
        getSaveButton().props.onPress();

        expect(mockOnSave).toHaveBeenCalledWith('Edited text');
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
    });

    it('should call the stored callback with the initial value when nothing was typed', () => {
        CallbackStore.setCallback(mockOnSave);
        renderScreen({initialValue: 'Initial text'});

        getSaveButton().props.onPress();

        expect(mockOnSave).toHaveBeenCalledWith('Initial text');
    });

    it('should close when save is pressed without a stored callback', () => {
        renderScreen({initialValue: 'Initial text'});

        getSaveButton().props.onPress();

        expect(navigateBack).toHaveBeenCalled();
    });

    it('should close without calling the stored callback when the Android back handler fires', () => {
        CallbackStore.setCallback(mockOnSave);
        renderScreen();

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            Screens.MM_BLOCKS_TEXT_INPUT,
            expect.any(Function),
        );

        getAndroidBackHandler()();

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
    });

    it('should remove the stored callback on unmount', () => {
        CallbackStore.setCallback(mockOnSave);
        const {unmount} = renderScreen();

        expect(CallbackStore.getCallback()).toBe(mockOnSave);
        unmount();
        expect(CallbackStore.getCallback()).toBeUndefined();
    });

    it('should forward multiline and maxLength to the input', () => {
        const {getByTestId} = renderScreen({multiline: true, maxLength: 120});

        const input = getByTestId(INPUT_TEST_ID);
        expect(input).toHaveProp('multiline', true);
        expect(input).toHaveProp('maxLength', 120);
    });

    it('should render a single line input by default', () => {
        const {getByTestId} = renderScreen();

        expect(getByTestId(INPUT_TEST_ID)).not.toHaveProp('multiline', true);
    });

    it('should hide the text for the password subtype', () => {
        const {getByTestId} = renderScreen({subtype: 'password'});

        const input = getByTestId(INPUT_TEST_ID);
        expect(input).toHaveProp('secureTextEntry', true);
        expect(input).toHaveProp('keyboardType', 'default');
    });

    it.each<[MmTextInputSubtype | undefined, string]>([
        [undefined, 'default'],
        ['text', 'default'],
        ['email', 'email-address'],
        ['number', 'numeric'],
        ['tel', 'phone-pad'],
        ['url', 'url'],
    ])('should map the %s subtype to the %s keyboard type', (subtype, keyboardType) => {
        const {getByTestId} = renderScreen({subtype});

        const input = getByTestId(INPUT_TEST_ID);
        expect(input).toHaveProp('keyboardType', keyboardType);
        expect(input).toHaveProp('secureTextEntry', false);
    });

    it('should pass the help text to the footer', () => {
        const {getByTestId} = renderScreen({helpText: 'Some help text'});

        const footer = getByTestId('mm_blocks_text_input.footer');
        expect(footer).toHaveProp('helpText', 'Some help text');
        expect(footer).toHaveProp('location', Screens.MM_BLOCKS_TEXT_INPUT);
    });
});
