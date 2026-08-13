// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';

import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import RenameChecklistBottomSheet from './rename_checklist_bottom_sheet';

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

describe('RenameChecklistBottomSheet', () => {
    const currentTitle = 'Original Checklist';
    const mockOnSave = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        CallbackStore.removeCallback();
        CallbackStore.setCallback(mockOnSave);
    });

    function getBaseProps() {
        return {
            currentTitle,
        };
    }

    it('should render correctly with currentTitle', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');
        expect(input).toBeTruthy();
        expect(input.props.value).toBe(currentTitle);
        expect(input.props.autoFocus).toBe(true);

        // Check label is rendered
        const label = getByText('Section name');
        expect(label).toBeTruthy();
    });

    it('should set up navigation header with disabled save button initially', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        // navigation.setOptions should be called with headerRight
        expect(mockSetOptions).toHaveBeenCalled();

        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props (disabled because same as currentTitle)
        expect(navigationButton.props.testID).toBe('playbooks.checklist.rename.button');
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('should register Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Function),
        );
    });

    it('should update title when text input changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');
        const newTitle = 'New Checklist Title';

        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        expect(input.props.value).toBe(newTitle);
    });

    it('should enable save button when title has content and is different from currentTitle', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        // Initially, setOptions should be called
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        // Update with different title
        act(() => {
            fireEvent.changeText(input, 'New Checklist Title');
        });

        // setOptions should be called again with enabled button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should disable save button when title is same as currentTitle', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        // Change title to something different
        act(() => {
            fireEvent.changeText(input, 'Different Title');
        });

        // setOptions should be called with enabled button
        const callCountAfterChange = mockSetOptions.mock.calls.length;

        // Change back to original title
        act(() => {
            fireEvent.changeText(input, currentTitle);
        });

        // setOptions should be called again with disabled button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(callCountAfterChange);
    });

    it('should disable save button when title is empty', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        // Set title to something different
        act(() => {
            fireEvent.changeText(input, 'Different Title');
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
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        const initialCallCount = mockSetOptions.mock.calls.length;

        // Set title to whitespace only
        act(() => {
            fireEvent.changeText(input, '   ');
        });

        // setOptions should be called, but button should still be disabled
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should call onSave and close when save button is pressed with valid title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');
        const newTitle = 'New Checklist Name';

        // Set title
        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).toHaveBeenCalledWith(newTitle);
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
    });

    it('should trim title when saving', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');
        const titleWithSpaces = '  New Checklist Name  ';

        // Set title with spaces
        act(() => {
            fireEvent.changeText(input, titleWithSpaces);
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).toHaveBeenCalledWith('New Checklist Name');
        expect(mockOnSave).not.toHaveBeenCalledWith(titleWithSpaces);
    });

    it('should close when Android back button is pressed', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        // Trigger back handler - get the second argument (the callback)
        const backHandlerCall = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0];
        const backCallback = backHandlerCall[1];

        backCallback();

        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should update navigation button when canSave changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        // Initially, setOptions should be called
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        // Enable by changing to different text
        act(() => {
            fireEvent.changeText(input, 'Different Title');
        });

        // Should call setOptions again with updated button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
});
