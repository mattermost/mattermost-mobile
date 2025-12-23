// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';

import {Preferences} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {getLastCallForButton} from '@test/mock_helpers';

import EditChecklistItemBottomSheet from './edit_checklist_item_bottom_sheet';

jest.mock('@screens/navigation', () => ({
    buildNavigationButton: jest.fn(),
    popTopScreen: jest.fn(),
    setButtons: jest.fn(),
}));

jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    RN.Keyboard = {
        dismiss: jest.fn(),
    };
    return RN;
});

jest.mock('@hooks/navigation_button_pressed', () => jest.fn());
jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('@managers/security_manager', () => ({
    getShieldScreenId: jest.fn((id) => `shield-${id}`),
}));

describe('EditChecklistItemBottomSheet', () => {
    const componentId = 'test-component-id' as any;
    const mockOnSave = jest.fn();

    const mockRightButton = {
        id: 'save-checklist-item',
        enabled: false,
        color: Preferences.THEMES.denim.sidebarHeaderTextColor,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(buildNavigationButton).mockReturnValue(mockRightButton as any);
    });

    function getBaseProps() {
        return {
            componentId,
            currentTitle: 'Current Task',
            currentDescription: 'Current description',
            onSave: mockOnSave,
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

    it('should set up navigation buttons on mount', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        expect(buildNavigationButton).toHaveBeenCalledWith(
            'save-checklist-item',
            'playbooks.checklist_item.edit.button',
            undefined,
            'Save',
        );
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [mockRightButton],
        });
    });

    it('should register navigation button press handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        expect(useNavButtonPressed).toHaveBeenCalledWith(
            'save-checklist-item',
            componentId,
            expect.any(Function),
            [expect.any(Function)],
        );
    });

    it('should register Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            componentId,
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

        // Initially disabled (no changes)
        expect(mockRightButton.enabled).toBe(false);

        // Update with different title
        act(() => {
            fireEvent.changeText(input, 'Different Title');
        });

        // Button should be enabled now
        const updatedButton = {
            ...mockRightButton,
            enabled: true,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [updatedButton],
        });
    });

    it('should enable save button when description is changed', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const descriptionInput = getByTestId('playbooks.checklist_item.edit.description_input');

        // Initially disabled (no changes)
        expect(mockRightButton.enabled).toBe(false);

        // Update with different description
        act(() => {
            fireEvent.changeText(descriptionInput, 'Different description');
        });

        // Button should be enabled now
        const updatedButton = {
            ...mockRightButton,
            enabled: true,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [updatedButton],
        });
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
        const updatedButton = {
            ...mockRightButton,
            enabled: false,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [updatedButton],
        });
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
        const updatedButton = {
            ...mockRightButton,
            enabled: false,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [updatedButton],
        });
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

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'save-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).toHaveBeenCalledWith({title: newTitle, description: 'Current description'});
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
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

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'save-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

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

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'save-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).toHaveBeenCalledWith({title: 'Task with spaces', description: 'Description with spaces'});
        expect(mockOnSave).not.toHaveBeenCalledWith(taskTitle, taskDescription);
    });

    it('should not call onSave when save button is pressed with empty title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');

        // Clear title
        act(() => {
            fireEvent.changeText(input, '');
        });

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'save-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should not call onSave when save button is pressed with whitespace-only title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<EditChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.edit.title_input');

        // Set title to whitespace only
        act(() => {
            fireEvent.changeText(input, '   ');
        });

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'save-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).not.toHaveBeenCalled();
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
        const updatedButton = {
            ...mockRightButton,
            enabled: false,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [updatedButton],
        });
    });
});

