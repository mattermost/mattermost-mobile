// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import {useServerUrl} from '@context/server';
import {updateChecklistItem} from '@playbooks/actions/remote/checklist';
import {navigateBack} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {showPlaybookErrorSnackbar} from '@utils/snack_bar';

import FillRequirements from './fill_requirements';

const serverUrl = 'some.server.url';

jest.mock('@context/server');
jest.mocked(useServerUrl).mockReturnValue(serverUrl);

jest.mock('@playbooks/actions/remote/checklist');
jest.mock('@screens/navigation');
jest.mock('@utils/snack_bar');
jest.mock('@hooks/android_back_handler');

const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({
        setOptions: mockSetOptions,
    })),
}));

jest.mock('@components/floating_input/floating_text_input_label', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingTextInput).mockImplementation((props: ComponentProps<typeof FloatingTextInput>) => (
    React.createElement('FloatingTextInput', {testID: props.testID || 'FloatingTextInput', ...props})
));

describe('FillRequirements', () => {
    function getBaseProps(): ComponentProps<typeof FillRequirements> {
        return {
            playbookRunId: 'run-1',
            itemId: 'item-1',
            checklistNumber: 0,
            itemNumber: 1,
            taskTitle: 'Deploy fix',
            requirements: [
                {id: 'r1', label: 'Ticket URL', value: ''},
                {id: 'r2', label: 'Root cause', value: 'existing'},
            ],
            currentState: '',
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(updateChecklistItem).mockResolvedValue({data: true});
    });

    it('should save a draft with the current state and trimmed values', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<FillRequirements {...props}/>);

        expect(getByTestId('requirement-value-r1').props.maxLength).toBe(1024);

        fireEvent.changeText(getByTestId('requirement-value-r1'), '  https://ticket  ');
        fireEvent.press(getByTestId('modal-save-requirements'));

        await waitFor(() => {
            expect(updateChecklistItem).toHaveBeenCalledWith(
                serverUrl,
                'run-1',
                'item-1',
                0,
                1,
                '',
                {r1: 'https://ticket', r2: 'existing'},
            );
        });
        expect(navigateBack).toHaveBeenCalled();
        expect(showPlaybookErrorSnackbar).not.toHaveBeenCalled();
    });

    it('should truncate requirement values to the server max length', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<FillRequirements {...props}/>);
        const longValue = 'a'.repeat(1100);

        fireEvent.changeText(getByTestId('requirement-value-r1'), longValue);

        expect(getByTestId('requirement-value-r1').props.value).toHaveLength(1024);
    });

    it('should require all fields before marking complete', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<FillRequirements {...props}/>);

        fireEvent.press(getByTestId('modal-save-and-complete'));

        expect(updateChecklistItem).not.toHaveBeenCalled();
        expect(getByTestId('requirement-value-r1').props.error).toBe(
            'This field is required to mark the task complete',
        );
    });

    it('should mark the task complete when all fields are filled', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<FillRequirements {...props}/>);

        fireEvent.changeText(getByTestId('requirement-value-r1'), 'https://ticket');
        fireEvent.press(getByTestId('modal-save-and-complete'));

        await waitFor(() => {
            expect(updateChecklistItem).toHaveBeenCalledWith(
                serverUrl,
                'run-1',
                'item-1',
                0,
                1,
                'closed',
                {r1: 'https://ticket', r2: 'existing'},
            );
        });
        expect(navigateBack).toHaveBeenCalled();
    });

    it('should show an error snackbar and stay open when save fails', async () => {
        jest.mocked(updateChecklistItem).mockResolvedValueOnce({error: new Error('network')});
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<FillRequirements {...props}/>);

        await act(async () => {
            fireEvent.press(getByTestId('modal-save-requirements'));
        });

        await waitFor(() => {
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
        });
        expect(navigateBack).not.toHaveBeenCalled();
        expect(getByTestId('modal-save-requirements')).toBeTruthy();
    });

    it('should hide save-and-complete when the task is already closed', () => {
        const props = getBaseProps();
        props.currentState = 'closed';
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<FillRequirements {...props}/>);

        expect(getByTestId('modal-save-requirements')).toBeTruthy();
        expect(queryByTestId('modal-save-and-complete')).toBeNull();
    });
});
