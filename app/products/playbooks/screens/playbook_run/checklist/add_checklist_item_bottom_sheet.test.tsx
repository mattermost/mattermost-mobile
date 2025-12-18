// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard, View} from 'react-native';

import {Preferences} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {getLastCall, getLastCallForButton} from '@test/mock_helpers';

import AddChecklistItemBottomSheet from './add_checklist_item_bottom_sheet';

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

describe('AddChecklistItemBottomSheet', () => {
    const componentId = 'test-component-id' as any;
    const mockOnSave = jest.fn();

    const mockRightButton = {
        id: 'add-checklist-item',
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
            onSave: mockOnSave,
        };
    }

    it('should render correctly with default props', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        expect(input).toBeTruthy();
        expect(input.props.value).toBe('');
        expect(input.props.autoFocus).toBe(true);

        // Check label is rendered
        const label = getByText('Task name');
        expect(label).toBeTruthy();
    });

    it('should set up navigation buttons on mount', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        expect(buildNavigationButton).toHaveBeenCalledWith(
            'add-checklist-item',
            'playbooks.checklist_item.add.save',
            undefined,
            'Add',
        );
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [mockRightButton],
        });
    });

    it('should register navigation button press handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        expect(useNavButtonPressed).toHaveBeenCalledWith(
            'add-checklist-item',
            componentId,
            expect.any(Function),
            [expect.any(Function)],
        );
    });

    it('should register Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            componentId,
            expect.any(Function),
        );
    });

    it('should update title when text input changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        const newTitle = 'New Task Title';

        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        expect(input.props.value).toBe(newTitle);
    });

    it('should enable save button when title has content', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Initially disabled (empty title)
        expect(mockRightButton.enabled).toBe(false);

        // Update with non-empty title
        act(() => {
            fireEvent.changeText(input, 'Task Title');
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
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Set title
        act(() => {
            fireEvent.changeText(input, 'Task Title');
        });

        // Button should be enabled now, covered by previous test, but needed to check otherwise there could be a race condition
        const checkButton = {
            ...mockRightButton,
            enabled: true,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [checkButton],
        });

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
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

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

    it('should call onSave and close when save button is pressed with valid title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        const taskTitle = 'New Task';

        // Set title
        act(() => {
            fireEvent.changeText(input, taskTitle);
        });

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'add-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).toHaveBeenCalledWith(taskTitle);
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
    });

    it('should trim title when saving', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');
        const taskTitle = '  Task with spaces  ';

        // Set title with spaces
        act(() => {
            fireEvent.changeText(input, taskTitle);
        });

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'add-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).toHaveBeenCalledWith('Task with spaces');
        expect(mockOnSave).not.toHaveBeenCalledWith(taskTitle);
    });

    it('should not call onSave when save button is pressed with empty title', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        // Trigger save button press without setting title
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'add-checklist-item');
        expect(lastCall).toBeDefined();
        const saveCallback = lastCall[2];
        expect(saveCallback).toBeDefined();
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(popTopScreen).not.toHaveBeenCalled();
    });

    it('should not call onSave when save button is pressed with whitespace-only title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Set title to whitespace only
        act(() => {
            fireEvent.changeText(input, '   ');
        });

        // Trigger save button press
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'add-checklist-item');
        const saveCallback = lastCall[2];
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).not.toHaveBeenCalled();
        expect(popTopScreen).not.toHaveBeenCalled();
    });

    it('should close when Android back button is pressed', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        // Trigger back handler
        const lastCall = getLastCall(jest.mocked(useAndroidHardwareBackHandler));
        const backCallback = lastCall[1];
        act(() => {
            backCallback();
        });

        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should apply shield screen ID to container', () => {
        const props = getBaseProps();
        const renderResult = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);
        const getAllByType = renderResult.UNSAFE_getAllByType;

        const views = getAllByType(View);
        const container = views.find((view: any) => view.props.nativeID === `shield-${componentId}`);
        expect(container).toBeTruthy();
        expect(container?.props.nativeID).toBe(`shield-${componentId}`);
        expect(SecurityManager.getShieldScreenId).toHaveBeenCalledWith(componentId);
    });

    it('should update navigation button when canSave changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist_item.add.input');

        // Initially disabled
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [{...mockRightButton, enabled: false}],
        });

        // Enable by adding text
        act(() => {
            fireEvent.changeText(input, 'Task');
        });

        // Should update with enabled button
        expect(setButtons).toHaveBeenLastCalledWith(componentId, {
            rightButtons: [{...mockRightButton, enabled: true}],
        });
    });

    it('should use correct theme color for button', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<AddChecklistItemBottomSheet {...props}/>);

        // Verify button is created with theme color
        const buttonCalls = jest.mocked(setButtons).mock.calls;
        expect(buttonCalls.length).toBeGreaterThan(0);
        const lastCall = buttonCalls[buttonCalls.length - 1];
        const rightButtons = lastCall[1]?.rightButtons;
        expect(rightButtons?.[0]?.color).toBe(Preferences.THEMES.denim.sidebarHeaderTextColor);
    });
});

