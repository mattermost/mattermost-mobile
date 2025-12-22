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

import RenameChecklistBottomSheet from './rename_checklist_bottom_sheet';

jest.mock('@screens/navigation', () => ({
    buildNavigationButton: jest.fn(),
    popTopScreen: jest.fn(),
    setButtons: jest.fn(),
}));

jest.mock('@hooks/navigation_button_pressed', () => jest.fn());
jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('@managers/security_manager', () => ({
    getShieldScreenId: jest.fn((id) => `shield-${id}`),
}));

describe('RenameChecklistBottomSheet', () => {
    const componentId = 'test-component-id' as any;
    const currentTitle = 'Original Checklist';
    const mockOnSave = jest.fn();

    const mockRightButton = {
        id: 'save-checklist-name',
        enabled: false,
        color: Preferences.THEMES.denim.sidebarHeaderTextColor,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(buildNavigationButton).mockReturnValue(mockRightButton as any);
        jest.mocked(useNavButtonPressed).mockImplementation((buttonId, compId, callback) => {
            // Simulate button press when buttonId matches
            if (buttonId === 'save-checklist-name' && compId === componentId) {
                // Store callback for manual triggering in tests
                (useNavButtonPressed as any).lastCallback = callback;
            }
        });
        jest.mocked(useAndroidHardwareBackHandler).mockImplementation((compId, callback) => {
            // Store callback for manual triggering in tests
            (useAndroidHardwareBackHandler as any).lastCallback = callback;
        });
    });

    function getBaseProps() {
        return {
            componentId,
            currentTitle,
            onSave: mockOnSave,
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

    it('should set up navigation buttons on mount', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        expect(buildNavigationButton).toHaveBeenCalledWith(
            'save-checklist-name',
            'playbooks.checklist.rename.button',
            undefined,
            'Save',
        );
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [mockRightButton],
        });
    });

    it('should register navigation button press handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        expect(useNavButtonPressed).toHaveBeenCalledWith(
            'save-checklist-name',
            componentId,
            expect.any(Function),
            [expect.any(Function)],
        );
    });

    it('should register Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            componentId,
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

        // Initially disabled (same as currentTitle)
        expect(mockRightButton.enabled).toBe(false);

        // Update with different title
        act(() => {
            fireEvent.changeText(input, 'New Checklist Title');
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

    it('should disable save button when title is same as currentTitle', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        // Change title to something different
        act(() => {
            fireEvent.changeText(input, 'Different Title');
        });

        // Button should be enabled
        const enabledButton = {
            ...mockRightButton,
            enabled: true,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [enabledButton],
        });

        // Change back to original title
        act(() => {
            fireEvent.changeText(input, currentTitle);
        });

        // Button should be disabled
        const disabledButton = {
            ...mockRightButton,
            enabled: false,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [disabledButton],
        });
    });

    it('should disable save button when title is empty', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        // Set title to something different
        act(() => {
            fireEvent.changeText(input, 'Different Title');
        });

        // Button should be enabled to ensure there are no race conditions passing as good
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
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

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
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');
        const newTitle = 'New Checklist Name';

        // Set title
        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        // Trigger save button press
        const saveCallback = (useNavButtonPressed as any).lastCallback;
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).toHaveBeenCalledWith(newTitle);
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
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

        // Trigger save button press
        const saveCallback = (useNavButtonPressed as any).lastCallback;
        act(() => {
            saveCallback();
        });

        expect(mockOnSave).toHaveBeenCalledWith('New Checklist Name');
        expect(mockOnSave).not.toHaveBeenCalledWith(titleWithSpaces);
    });

    it('should close when Android back button is pressed', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        // Trigger back handler
        const backCallback = (useAndroidHardwareBackHandler as any).lastCallback;
        act(() => {
            backCallback();
        });

        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should update navigation button when canSave changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenameChecklistBottomSheet {...props}/>);

        const input = getByTestId('playbooks.checklist.rename.input');

        // Initially disabled (same as currentTitle)
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [{...mockRightButton, enabled: false}],
        });

        // Enable by changing to different text
        act(() => {
            fireEvent.changeText(input, 'Different Title');
        });

        // Should update with enabled button
        expect(setButtons).toHaveBeenLastCalledWith(componentId, {
            rightButtons: [{...mockRightButton, enabled: true}],
        });
    });
});

