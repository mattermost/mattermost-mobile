// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';

import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EditChecklistItemBottomSheet from './edit_checklist_item_bottom_sheet';

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

describe('EditChecklistItemBottomSheet', () => {
    const mockOnSave = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        CallbackStore.removeCallback();
        CallbackStore.setCallback(mockOnSave);
    });

    function getBaseProps() {
        return {
            currentTitle: 'Current Task',
            currentDescription: 'Current description',
        };
    }

    it('should render correctly with default props', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const titleInput = getByTestId('playbooks.checklist_item.edit.title_input');
        expect(titleInput).toBeTruthy();
        expect(titleInput.props.value).toBe('Current Task');
        expect(titleInput.props.autoFocus).toBe(true);

        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');
        expect(descriptionInput).toBeTruthy();
        expect(descriptionInput.props.value).toBe('Current description');

        // Check labels are rendered
        const titleLabel = getByText('Task name');
        expect(titleLabel).toBeTruthy();
        const descriptionLabel = getByText('Description');
        expect(descriptionLabel).toBeTruthy();
    });

    it('should render correctly without description', () => {
        const props = {
            ...getBaseProps(),
            currentDescription: undefined,
        };
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');
        expect(descriptionInput.props.value).toBe('');
    });

    it('should set up navigation header with disabled save button initially', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        // navigation.setOptions should be called with headerRight
        expect(mockSetOptions).toHaveBeenCalled();

        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props (disabled initially because no changes)
        expect(navigationButton.props.testID).toBe('playbooks.checklist_item.edit.save.button');
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('should register Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            Screens.PLAYBOOK_EDIT_CHECKLIST_ITEM,
            expect.any(Function),
        );
    });

    it('should update title when text input changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');
        const newTitle = 'New Task Title';

        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        expect(input.props.value).toBe(newTitle);
    });

    it('should update description when text input changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');
        const newDescription = 'New description';

        act(() => {
            fireEvent.changeText(descriptionInput, newDescription);
        });

        expect(descriptionInput.props.value).toBe(newDescription);
    });

    it('should enable save button when title is changed', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');

        // Check initial state
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        // Update with different title
        act(() => {
            fireEvent.changeText(input, 'Different Title');
        });

        // setOptions should be called again with enabled button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
        const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = lastCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
        expect(navigationButton.props.disabled).toBe(false);
    });

    it('should enable save button when description is changed', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');

        // Check initial state
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        // Update with different description
        act(() => {
            fireEvent.changeText(descriptionInput, 'Different description');
        });

        // setOptions should be called again with enabled button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
        const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = lastCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
        expect(navigationButton.props.disabled).toBe(false);
    });

    it('should disable save button when title is empty', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');

        // Clear title
        act(() => {
            fireEvent.changeText(input, '');
        });

        // Button should be disabled
        const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = lastCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('should disable save button when title is only whitespace', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');

        // Set title to whitespace only
        act(() => {
            fireEvent.changeText(input, '   ');
        });

        // Button should be disabled
        const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = lastCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('should call onSave and close when save button is pressed with valid changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');
        const newTitle = 'Updated Task';

        // Set new title
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

        expect(mockOnSave).toHaveBeenCalledWith({title: newTitle, description: 'Current description'});
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
    });

    it('should call onSave with updated description', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const titleInput = getByTestId('playbooks.checklist_item.edit.title_input');
        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');
        const newTitle = 'Updated Task';
        const newDescription = 'Updated description';

        // Set new title and description
        act(() => {
            fireEvent.changeText(titleInput, newTitle);
            fireEvent.changeText(descriptionInput, newDescription);
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).toHaveBeenCalledWith({title: newTitle, description: newDescription});
    });

    it('should trim title and description when saving', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const titleInput = getByTestId('playbooks.checklist_item.edit.title_input');
        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');
        const taskTitle = '  Task with spaces  ';
        const taskDescription = '  Description with spaces  ';

        // Set title and description with spaces
        act(() => {
            fireEvent.changeText(titleInput, taskTitle);
            fireEvent.changeText(descriptionInput, taskDescription);
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).toHaveBeenCalledWith({title: 'Task with spaces', description: 'Description with spaces'});
        expect(mockOnSave).not.toHaveBeenCalledWith({title: taskTitle, description: taskDescription});
    });

    it('should not call onSave when save button is pressed with empty title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');

        // Clear title
        act(() => {
            fireEvent.changeText(input, '');
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

    it('should not call onSave when save button is pressed with whitespace-only title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');

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

    it('should not enable save button when values are unchanged', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const titleInput = getByTestId('playbooks.checklist_item.edit.title_input');
        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');

        // Set values back to original
        act(() => {
            fireEvent.changeText(titleInput, 'Current Task');
            fireEvent.changeText(descriptionInput, 'Current description');
        });

        // Button should remain disabled
        const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = lastCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
        expect(navigationButton.props.disabled).toBe(true);
    });
});

