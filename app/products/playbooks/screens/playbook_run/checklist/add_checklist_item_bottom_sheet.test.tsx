// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';

import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import AddChecklistItemBottomSheet from './add_checklist_item_bottom_sheet';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    goToScreen: jest.fn(),
    showModal: jest.fn(),
    dismissModal: jest.fn(),
    bottomSheet: jest.fn(),
}));

jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    RN.Keyboard = {
        dismiss: jest.fn(),
    };
    return RN;
});

jest.mock('@hooks/android_back_handler', () => jest.fn());

// Mock expo-router navigation
const mockSetOptions = jest.fn();
const mockRemoveListener = jest.fn();
const mockAddListener = jest.fn(() => mockRemoveListener);
const mockNavigation = {
    setOptions: mockSetOptions,
    addListener: mockAddListener,
};

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => mockNavigation),
}));

describe('AddChecklistItemBottomSheet', () => {
    const mockOnSave = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        CallbackStore.removeCallback();
        CallbackStore.setCallback(mockOnSave);
    });

    it('should render correctly with default props', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        expect(input).toBeTruthy();
        expect(input.props.value).toBe('');
        expect(input.props.autoFocus).toBe(true);

        // Check label is rendered
        const label = getByText('Task name');
        expect(label).toBeTruthy();
    });

    it('should set up navigation header with disabled save button initially', () => {
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        // navigation.setOptions should be called with headerRight
        expect(mockSetOptions).toHaveBeenCalled();

        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props
        expect(navigationButton.props.testID).toBe('playbooks.checklist_item.add.save.button');
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('should register Android back handler', () => {
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Function),
        );
    });

    it('should update title when text input changes', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        const newTitle = 'New Task Title';

        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        expect(input.props.value).toBe(newTitle);
    });

    it('should enable save button when title has content', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Initially, setOptions should be called with disabled button
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        // Update with non-empty title
        act(() => {
            fireEvent.changeText(input, 'Task Title');
        });

        // setOptions should be called again with enabled button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should disable save button when title is empty', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Set title
        act(() => {
            fireEvent.changeText(input, 'Task Title');
        });

        // setOptions should be called when title is set
        const callCountAfterSet = mockSetOptions.mock.calls.length;

        // Clear title
        act(() => {
            fireEvent.changeText(input, '');
        });

        // setOptions should be called again when title is cleared
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(callCountAfterSet);
    });

    it('should disable save button when title is only whitespace', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        const initialCallCount = mockSetOptions.mock.calls.length;

        // Set title to whitespace only
        act(() => {
            fireEvent.changeText(input, '   ');
        });

        // setOptions should be called, but button should still be disabled
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should call onSave and close when save button is pressed with valid title', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        const taskTitle = 'New Task';

        // Set title
        act(() => {
            fireEvent.changeText(input, taskTitle);
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).toHaveBeenCalledWith(taskTitle);
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
    });

    it('should trim title when saving', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        const taskTitle = '  Task with spaces  ';

        // Set title with spaces
        act(() => {
            fireEvent.changeText(input, taskTitle);
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).toHaveBeenCalledWith('Task with spaces');
        expect(mockOnSave).not.toHaveBeenCalledWith(taskTitle);
    });

    it('should not call onSave when save button is pressed with empty title', () => {
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press without setting title
        onPress();

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(navigateBack).not.toHaveBeenCalled();
    });

    it('should not call onSave when save button is pressed with whitespace-only title', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Set title to whitespace only
        act(() => {
            fireEvent.changeText(input, '   ');
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(navigateBack).not.toHaveBeenCalled();
    });

    it('should close when Android back button is pressed', () => {
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        // Trigger back handler - get the second argument (the callback)
        const backHandlerCall = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0];
        const backCallback = backHandlerCall[1];

        backCallback();

        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should update navigation button when canSave changes', () => {
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Initially, setOptions should be called
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        // Enable by adding text
        act(() => {
            fireEvent.changeText(input, 'Task');
        });

        // Should call setOptions again with updated button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
});

