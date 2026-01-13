// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';

import {Preferences} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {renamePlaybookRun} from '@playbooks/actions/remote/runs';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import RenamePlaybookRunBottomSheet from './rename_playbook_run_bottom_sheet';

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
jest.mock('@playbooks/actions/remote/runs', () => ({
    renamePlaybookRun: jest.fn(),
}));
jest.mock('@utils/snack_bar', () => ({
    showPlaybookErrorSnackbar: jest.fn(),
}));
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'some.server.url'),
}));

describe('RenamePlaybookRunBottomSheet', () => {
    const componentId = 'test-component-id' as any;
    const currentTitle = 'Original Playbook Run';
    const playbookRunId = 'run-id-123';

    const mockRightButton = {
        id: 'save-playbook-run-name',
        enabled: false,
        color: Preferences.THEMES.denim.sidebarHeaderTextColor,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(buildNavigationButton).mockReturnValue(mockRightButton as any);
        jest.mocked(renamePlaybookRun).mockResolvedValue({data: true});
        jest.mocked(useNavButtonPressed).mockImplementation((buttonId, compId, callback) => {
            // Simulate button press when buttonId matches
            if (buttonId === 'save-playbook-run-name' && compId === componentId) {
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
            playbookRunId,
        };
    }

    it('should render correctly with currentTitle', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        expect(input).toBeTruthy();
        expect(input.props.value).toBe(currentTitle);
        expect(input.props.autoFocus).toBe(true);

        // Check label is rendered
        const label = getByText('Checklist name');
        expect(label).toBeTruthy();
    });

    it('should set up navigation buttons on mount', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        expect(buildNavigationButton).toHaveBeenCalledWith(
            'save-playbook-run-name',
            'playbooks.playbook_run.rename.button',
            undefined,
            'Save',
        );
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [mockRightButton],
        });
    });

    it('should register navigation button press handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        expect(useNavButtonPressed).toHaveBeenCalledWith(
            'save-playbook-run-name',
            componentId,
            expect.any(Function),
            [expect.any(Function)],
        );
    });

    it('should register Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            componentId,
            expect.any(Function),
        );
    });

    it('should update title when text input changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        const newTitle = 'New Playbook Run Title';

        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        expect(input.props.value).toBe(newTitle);
    });

    it('should enable save button when title has content and is different from currentTitle', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

        // Initially disabled (same as currentTitle)
        expect(mockRightButton.enabled).toBe(false);

        // Update with different title
        act(() => {
            fireEvent.changeText(input, 'New Playbook Run Title');
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
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

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
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

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
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

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

    it('should call renamePlaybookRun and close when save button is pressed with valid title', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        const newTitle = 'New Playbook Run Name';

        // Set title
        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        // Trigger save button press
        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(renamePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, newTitle);
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
    });

    it('should trim title when saving', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        const titleWithSpaces = '  New Playbook Run Name  ';

        // Set title with spaces
        act(() => {
            fireEvent.changeText(input, titleWithSpaces);
        });

        // Trigger save button press
        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(renamePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, 'New Playbook Run Name');
        expect(renamePlaybookRun).not.toHaveBeenCalledWith('some.server.url', playbookRunId, titleWithSpaces);
    });

    it('should close when Android back button is pressed', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        // Trigger back handler
        const backCallback = (useAndroidHardwareBackHandler as any).lastCallback;
        act(() => {
            backCallback();
        });

        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
        expect(renamePlaybookRun).not.toHaveBeenCalled();
    });

    it('should update navigation button when canSave changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

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

