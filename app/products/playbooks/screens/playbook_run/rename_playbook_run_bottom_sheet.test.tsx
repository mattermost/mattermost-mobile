// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Keyboard} from 'react-native';

import {Preferences} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {updatePlaybookRun} from '@playbooks/actions/remote/runs';
import {buildNavigationButton, popTopScreen, setButtons} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

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
    updatePlaybookRun: jest.fn(),
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
    const currentSummary = 'Original summary';
    const playbookRunId = 'run-id-123';

    const mockRightButton = {
        id: 'save-playbook-run-name',
        enabled: false,
        color: Preferences.THEMES.denim.sidebarHeaderTextColor,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(buildNavigationButton).mockReturnValue(mockRightButton as any);
        jest.mocked(updatePlaybookRun).mockResolvedValue({data: true});
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

    function getBaseProps(canEditSummary = true) {
        return {
            componentId,
            currentTitle,
            currentSummary,
            playbookRunId,
            canEditSummary,
        };
    }

    it('should render correctly with currentTitle and currentSummary', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const titleInput = getByTestId('playbooks.playbook_run.rename.input');
        expect(titleInput).toBeTruthy();
        expect(titleInput.props.value).toBe(currentTitle);
        expect(titleInput.props.autoFocus).toBe(true);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');
        expect(summaryInput).toBeTruthy();
        expect(summaryInput.props.value).toBe(currentSummary);
        expect(summaryInput.props.multiline).toBe(true);

        // Check labels are rendered
        const nameLabel = getByText('Checklist name');
        expect(nameLabel).toBeTruthy();
        const summaryLabel = getByText('Summary');
        expect(summaryLabel).toBeTruthy();
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

    it('should call updatePlaybookRun and close when save button is pressed with valid title', async () => {
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

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, newTitle, currentSummary, true);
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

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, 'New Playbook Run Name', currentSummary, true);
        expect(updatePlaybookRun).not.toHaveBeenCalledWith('some.server.url', playbookRunId, titleWithSpaces, currentSummary, true);
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
        expect(updatePlaybookRun).not.toHaveBeenCalled();
    });

    it('should enable save button when only summary changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');

        // Initially disabled (same as original)
        expect(mockRightButton.enabled).toBe(false);

        // Update with different summary
        act(() => {
            fireEvent.changeText(summaryInput, 'New summary');
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

    it('should call updatePlaybookRun with updated summary', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');
        const newSummary = 'Updated summary text';

        act(() => {
            fireEvent.changeText(summaryInput, newSummary);
        });

        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, currentTitle, newSummary, true);
    });

    it('should trim summary when saving', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');
        const summaryWithSpaces = '  New summary with spaces  ';

        act(() => {
            fireEvent.changeText(summaryInput, summaryWithSpaces);
        });

        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, currentTitle, 'New summary with spaces', true);
    });

    it('should show error snackbar when save fails', async () => {
        jest.mocked(updatePlaybookRun).mockResolvedValueOnce({error: 'Some error'});
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        act(() => {
            fireEvent.changeText(input, 'New Title');
        });

        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
        expect(popTopScreen).not.toHaveBeenCalled();
    });

    it('should allow clearing an existing summary', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');

        act(() => {
            fireEvent.changeText(summaryInput, '');
        });

        // Save button should be enabled since summary changed (from non-empty to empty)
        const updatedButton = {
            ...mockRightButton,
            enabled: true,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [updatedButton],
        });

        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, currentTitle, '', true);
    });

    it('should disable save button when summary is reverted to original', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');

        // Change summary to something different
        act(() => {
            fireEvent.changeText(summaryInput, 'Different Summary');
        });

        // Button should be enabled
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [{...mockRightButton, enabled: true}],
        });

        // Change back to original summary
        act(() => {
            fireEvent.changeText(summaryInput, currentSummary);
        });

        // Button should be disabled since nothing changed
        expect(setButtons).toHaveBeenLastCalledWith(componentId, {
            rightButtons: [{...mockRightButton, enabled: false}],
        });
    });

    it('should update both name and summary when both are changed', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const titleInput = getByTestId('playbooks.playbook_run.rename.input');
        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');

        const newTitle = 'Brand New Title';
        const newSummary = 'Brand New Summary';

        act(() => {
            fireEvent.changeText(titleInput, newTitle);
            fireEvent.changeText(summaryInput, newSummary);
        });

        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, newTitle, newSummary, true);
        expect(popTopScreen).toHaveBeenCalledWith(componentId);
    });

    it('should hide summary input when summary editing is disabled', () => {
        const props = getBaseProps(false);
        const {queryByTestId, queryByText} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        expect(queryByTestId('playbooks.playbook_run.edit.summary_input')).toBeNull();
        expect(queryByText('Summary')).toBeNull();
    });

    it('should enable save button when name changes and summary editing is disabled', () => {
        const props = getBaseProps(false);
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

        act(() => {
            fireEvent.changeText(input, 'New Playbook Run Title');
        });

        const updatedButton = {
            ...mockRightButton,
            enabled: true,
        };
        expect(setButtons).toHaveBeenCalledWith(componentId, {
            rightButtons: [updatedButton],
        });
    });

    it('should call updatePlaybookRun when summary editing is disabled', async () => {
        const props = getBaseProps(false);
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        const newTitle = 'New Playbook Run Title';

        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        const saveCallback = (useNavButtonPressed as any).lastCallback;
        await act(async () => {
            await saveCallback();
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, newTitle, currentSummary, false);
    });
});

