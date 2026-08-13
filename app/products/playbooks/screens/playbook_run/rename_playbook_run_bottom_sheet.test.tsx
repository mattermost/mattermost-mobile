// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {updatePlaybookRun} from '@playbooks/actions/remote/runs';
import {navigateBack} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {dismissKeyboard} from '@utils/keyboard';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

import RenamePlaybookRunBottomSheet from './rename_playbook_run_bottom_sheet';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    goToScreen: jest.fn(),
    showModal: jest.fn(),
    dismissModal: jest.fn(),
    bottomSheet: jest.fn(),
}));

jest.mock('@utils/keyboard', () => ({
    dismissKeyboard: jest.fn(),
}));

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
jest.mock('@playbooks/actions/remote/runs', () => ({
    updatePlaybookRun: jest.fn(() => Promise.resolve({error: undefined})),
}));
jest.mock('@utils/snack_bar', () => ({
    showPlaybookErrorSnackbar: jest.fn(),
}));
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'some.server.url'),
}));

describe('RenamePlaybookRunBottomSheet', () => {
    const currentTitle = 'Original Playbook Run';
    const currentSummary = 'Original summary';
    const playbookRunId = 'run-id-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(canEditSummary = true) {
        return {
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

    it('should set up navigation header with disabled save button initially', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        // navigation.setOptions should be called with headerRight
        expect(mockSetOptions).toHaveBeenCalled();

        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props (disabled because same as currentTitle)
        expect(navigationButton.props.testID).toBe('playbooks.playbook_run.rename.button');
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('should register Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            expect.any(String),
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

        // Initially, setOptions should be called
        expect(mockSetOptions).toHaveBeenCalled();
        const initialCallCount = mockSetOptions.mock.calls.length;

        // Update with different title
        act(() => {
            fireEvent.changeText(input, 'New Playbook Run Title');
        });

        // setOptions should be called again with enabled button
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should disable save button when title is same as currentTitle', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

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
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

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
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

        const initialCallCount = mockSetOptions.mock.calls.length;

        // Set title to whitespace only
        act(() => {
            fireEvent.changeText(input, '   ');
        });

        // setOptions should be called, but button should still be disabled
        expect(mockSetOptions.mock.calls.length).toBeGreaterThan(initialCallCount);
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

        // Render the headerRight component and press the save button
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, newTitle, currentSummary, true);
        expect(dismissKeyboard).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
    });

    it('should trim title when saving', async () => {
        // Mock successful response
        jest.mocked(updatePlaybookRun).mockResolvedValue({error: undefined});

        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        const titleWithSpaces = '  New Playbook Run Name  ';

        // Set title with spaces
        act(() => {
            fireEvent.changeText(input, titleWithSpaces);
        });

        // Render the headerRight component and press the save button
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, 'New Playbook Run Name', currentSummary, true);
        expect(updatePlaybookRun).not.toHaveBeenCalledWith('some.server.url', playbookRunId, titleWithSpaces, currentSummary, true);
    });

    it('should close when Android back button is pressed', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        // Trigger back handler - get the second argument (the callback)
        const backHandlerCall = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0];
        const backCallback = backHandlerCall[1];

        backCallback();

        expect(dismissKeyboard).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
        expect(updatePlaybookRun).not.toHaveBeenCalled();
    });

    it('should update navigation button when canSave changes', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');

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

    it('should call updatePlaybookRun with updated summary', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');
        const newSummary = 'Updated summary text';

        act(() => {
            fireEvent.changeText(summaryInput, newSummary);
        });

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
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

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
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

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
        });

        expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
        expect(navigateBack).not.toHaveBeenCalled();
    });

    it('should allow clearing an existing summary', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const summaryInput = getByTestId('playbooks.playbook_run.edit.summary_input');

        act(() => {
            fireEvent.changeText(summaryInput, '');
        });

        // Save button should be enabled since summary changed (from non-empty to empty)
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props (disabled because same as currentTitle)
        expect(navigationButton.props.disabled).toBe(false);

        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
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

        const enabledCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const enabledButton = (enabledCall.headerRight)() as React.ReactElement<{disabled: boolean}>;
        expect(enabledButton.props.disabled).toBe(false);

        // Change back to original summary
        act(() => {
            fireEvent.changeText(summaryInput, currentSummary);
        });

        const disabledCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const disabledButton = (disabledCall.headerRight)() as React.ReactElement<{disabled: boolean}>;
        expect(disabledButton.props.disabled).toBe(true);
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

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, newTitle, newSummary, true);
        expect(navigateBack).toHaveBeenCalledWith();
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

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props (disabled because same as currentTitle)
        expect(navigationButton.props.disabled).toBe(false);
    });

    it('should call updatePlaybookRun when summary editing is disabled', async () => {
        const props = getBaseProps(false);
        const {getByTestId} = renderWithIntlAndTheme(<RenamePlaybookRunBottomSheet {...props}/>);

        const input = getByTestId('playbooks.playbook_run.rename.input');
        const newTitle = 'New Playbook Run Title';

        act(() => {
            fireEvent.changeText(input, newTitle);
        });

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const {getByTestId: getHeaderButton} = renderWithIntlAndTheme(headerRight());
        const saveButton = getHeaderButton('playbooks.playbook_run.rename.button');

        // Trigger save button press
        await act(async () => {
            fireEvent.press(saveButton);
        });

        expect(updatePlaybookRun).toHaveBeenCalledWith('some.server.url', playbookRunId, newTitle, currentSummary, false);
    });
});

