// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {act, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import CompassIcon from '@components/compass_icon';
import FloatingAutocompleteSelector from '@components/floating_input/floating_autocomplete_selector';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import OptionItem from '@components/option_item';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {createPlaybookRun} from '@playbooks/actions/remote/runs';
import {popTopScreen, setButtons} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import StartARun from './start_a_run';

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).getImageSource = jest.fn().mockResolvedValue({uri: 'close-icon'});

jest.mock('@components/floating_input/floating_text_input_label', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingTextInput).mockImplementation((props) => React.createElement('FloatingTextInput', {testID: props.testID, ...props}));

jest.mock('@components/floating_input/floating_autocomplete_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingAutocompleteSelector).mockImplementation((props) => React.createElement('FloatingAutocompleteSelector', props));

jest.mock('@components/option_item', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(OptionItem).mockImplementation((props) => React.createElement('OptionItem', props));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://server-url.com'),
}));

jest.mock('@hooks/navigation_button_pressed', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@playbooks/actions/remote/runs', () => ({
    createPlaybookRun: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    popTopScreen: jest.fn(),
    setButtons: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showPlaybookErrorSnackbar: jest.fn(),
}));

function getLastCall<T, U extends unknown[], V>(mock: jest.Mock<T, U, V>): U {
    const allCalls = mock.mock.calls;
    return allCalls[allCalls.length - 1];
}

function getLastCallForButton<T, U extends unknown[], V>(mock: jest.Mock<T, U, V>, buttonId: string): U {
    const allCalls = mock.mock.calls;
    const buttonCalls = allCalls.filter((call) => call[0] === buttonId);
    return buttonCalls[buttonCalls.length - 1];
}

describe('StartARun', () => {
    function getBaseProps(): ComponentProps<typeof StartARun> {
        return {
            componentId: 'PlaybooksStartARun',
            playbook: TestHelper.fakePlaybook({
                id: 'playbook-id',
                title: 'Test Playbook',
            }),
            currentUserId: 'user-id',
            currentTeamId: 'team-id',
            onRunCreated: jest.fn(),
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(CompassIcon.getImageSource).mockResolvedValue({uri: 'close-icon'});
        jest.mocked(createPlaybookRun).mockResolvedValue({
            data: TestHelper.fakePlaybookRun({id: 'run-id'}),
        });
    });

    it('should render correctly with default props', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        expect(getByTestId('start_run.run_name_input')).toBeTruthy();
        expect(getByTestId('start_run.run_description_input')).toBeTruthy();
        expect(getByTestId('start_run.existing_channel_option')).toBeTruthy();
        expect(getByTestId('start_run.new_channel_option')).toBeTruthy();
    });

    it('should initialize run name from playbook channel_name_template when channel_mode is create_new_channel', () => {
        const props = getBaseProps();
        props.playbook.channel_mode = 'create_new_channel';
        props.playbook.channel_name_template = 'Template Name';

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        expect(runNameInput).toHaveProp('value', 'Template Name');
    });

    it('should initialize run description from playbook run_summary_template when enabled', () => {
        const props = getBaseProps();
        props.playbook.run_summary_template_enabled = true;
        props.playbook.run_summary_template = 'Template Description';

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runDescriptionInput = getByTestId('start_run.run_description_input');
        expect(runDescriptionInput).toHaveProp('value', 'Template Description');
    });

    it('should update run name when input changes', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');

        await act(async () => {
            runNameInput.props.onChangeText('New Run Name');
        });

        await waitFor(() => {
            expect(getByTestId('start_run.run_name_input')).toHaveProp('value', 'New Run Name');
        });
    });

    it('should update run description when input changes', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runDescriptionInput = getByTestId('start_run.run_description_input');

        await act(async () => {
            runDescriptionInput.props.onChangeText('New Description');
        });

        await waitFor(() => {
            expect(getByTestId('start_run.run_description_input')).toHaveProp('value', 'New Description');
        });
    });

    it('should show existing channel selector when existing option is selected', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const existingOption = getByTestId('start_run.existing_channel_option');

        await act(async () => {
            existingOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.existing_channel_selector')).toBeTruthy();
        });
    });

    it('should show new channel options when new channel option is selected', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const newChannelOption = getByTestId('start_run.new_channel_option');

        await act(async () => {
            newChannelOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toBeTruthy();
            expect(getByTestId('start_run.new_channel_private_option')).toBeTruthy();
        });
    });

    it('should select public channel option when clicked', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        // First select new channel option
        const newChannelOption = getByTestId('start_run.new_channel_option');
        await act(async () => {
            newChannelOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toBeTruthy();
        });

        // Then select public channel
        const publicOption = getByTestId('start_run.new_channel_public_option');
        await act(async () => {
            publicOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toHaveProp('selected', true);
            expect(getByTestId('start_run.new_channel_private_option')).toHaveProp('selected', false);
        });
    });

    it('should select private channel option when clicked', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        // First select new channel option
        const newChannelOption = getByTestId('start_run.new_channel_option');
        await act(async () => {
            newChannelOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_private_option')).toBeTruthy();
        });

        // Then select private channel
        const privateOption = getByTestId('start_run.new_channel_private_option');
        await act(async () => {
            privateOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toHaveProp('selected', false);
            expect(getByTestId('start_run.new_channel_private_option')).toHaveProp('selected', true);
        });
    });

    it('should disable create button when run name is empty', async () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<StartARun {...props}/>);

        await waitFor(() => {
            expect(setButtons).toHaveBeenCalled();
        });

        const lastCall = getLastCall(jest.mocked(setButtons));
        const rightButton = lastCall[1]?.rightButtons?.[0];
        expect(rightButton?.enabled).toBe(false);
    });

    it('should enable create button when run name is provided', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        await act(async () => {
            runNameInput.props.onChangeText('Test Run');
        });

        await waitFor(() => {
            expect(setButtons).toHaveBeenCalled();
        });

        const lastCall = getLastCall(jest.mocked(setButtons));
        const rightButton = lastCall[1]?.rightButtons?.[0];
        expect(rightButton?.enabled).toBe(true);
    });

    it('should show error message when run name is empty', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        expect(runNameInput).toHaveProp('error', expect.any(String));
    });

    it('should not show error message when run name is provided', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        await act(async () => {
            runNameInput.props.onChangeText('Test Run');
        });

        await waitFor(() => {
            expect(getByTestId('start_run.run_name_input').props.error).toBeUndefined();
        });
    });

    it('should create run successfully with existing channel', async () => {
        const props = getBaseProps();
        const mockRun = TestHelper.fakePlaybookRun({id: 'run-id'});
        jest.mocked(createPlaybookRun).mockResolvedValue({data: mockRun});

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        await act(async () => {
            runNameInput.props.onChangeText('Test Run');
        });

        await waitFor(() => {
            expect(getByTestId('start_run.run_name_input')).toHaveProp('value', 'Test Run');
        });

        // Get the create button handler
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'create-run');
        const createHandler = lastCall[2];

        // Simulate create button press
        await act(async () => {
            createHandler();
        });

        await waitFor(() => {
            expect(createPlaybookRun).toHaveBeenCalledWith(
                'https://server-url.com',
                'playbook-id',
                'user-id',
                'team-id',
                'Test Run',
                '',
                undefined,
                undefined,
            );
            expect(popTopScreen).toHaveBeenCalledWith('PlaybooksStartARun');
            expect(props.onRunCreated).toHaveBeenCalledWith(mockRun);
        });
    });

    it('should create run with new channel and private setting', async () => {
        const props = getBaseProps();
        const mockRun = TestHelper.fakePlaybookRun({id: 'run-id'});
        jest.mocked(createPlaybookRun).mockResolvedValue({data: mockRun});

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        await act(async () => {
            runNameInput.props.onChangeText('Test Run');
        });

        // Select new channel option
        const newChannelOption = getByTestId('start_run.new_channel_option');
        await act(async () => {
            newChannelOption.props.action();
        });

        // Select public channel
        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toBeTruthy();
        });

        const privateOption = getByTestId('start_run.new_channel_private_option');
        await act(async () => {
            privateOption.props.action();
        });

        // Verify the state is correct
        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_private_option')).toHaveProp('selected', true);
        });

        // Get the create button handler
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'create-run');
        const createHandler = lastCall[2];

        // Simulate create button press
        await act(async () => {
            createHandler();
        });

        await waitFor(() => {
            expect(createPlaybookRun).toHaveBeenCalledWith(
                'https://server-url.com',
                'playbook-id',
                'user-id',
                'team-id',
                'Test Run',
                '',
                undefined,
                false, // createPublicRun
            );
        });
    });

    it('should create run with new channel and public setting', async () => {
        const props = getBaseProps();
        const mockRun = TestHelper.fakePlaybookRun({id: 'run-id'});
        jest.mocked(createPlaybookRun).mockResolvedValue({data: mockRun});

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        await act(async () => {
            runNameInput.props.onChangeText('Test Run');
        });

        // Select new channel option
        const newChannelOption = getByTestId('start_run.new_channel_option');
        await act(async () => {
            newChannelOption.props.action();
        });

        // Select public channel
        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toBeTruthy();
        });

        const publicOption = getByTestId('start_run.new_channel_public_option');
        await act(async () => {
            publicOption.props.action();
        });

        // Verify the state is correct
        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toHaveProp('selected', true);
        });

        // Get the create button handler
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'create-run');
        const createHandler = lastCall[2];

        // Simulate create button press
        await act(async () => {
            createHandler();
        });

        await waitFor(() => {
            expect(createPlaybookRun).toHaveBeenCalledWith(
                'https://server-url.com',
                'playbook-id',
                'user-id',
                'team-id',
                'Test Run',
                '',
                undefined,
                true, // createPublicRun
            );
        });
    });

    it('should handle createPlaybookRun error', async () => {
        const props = getBaseProps();
        const {showPlaybookErrorSnackbar} = require('@utils/snack_bar');
        jest.mocked(createPlaybookRun).mockResolvedValue({
            error: {message: 'Error creating run'},
        });

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        await act(async () => {
            runNameInput.props.onChangeText('Test Run');
        });

        // Get the create button handler
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'create-run');
        const createHandler = lastCall[2];

        // Simulate create button press
        await act(async () => {
            createHandler();
        });

        await waitFor(() => {
            expect(createPlaybookRun).toHaveBeenCalled();
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
            expect(popTopScreen).not.toHaveBeenCalled();
            expect(props.onRunCreated).not.toHaveBeenCalled();
        });
    });

    it('should trim run name and description when creating run', async () => {
        const props = getBaseProps();
        const mockRun = TestHelper.fakePlaybookRun({id: 'run-id'});
        jest.mocked(createPlaybookRun).mockResolvedValue({data: mockRun});

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        const runDescriptionInput = getByTestId('start_run.run_description_input');

        await act(async () => {
            runNameInput.props.onChangeText('  Test Run  ');
            runDescriptionInput.props.onChangeText('  Test Description  ');
        });

        // Get the create button handler
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'create-run');
        const createHandler = lastCall[2];

        // Simulate create button press
        await act(async () => {
            createHandler();
        });

        // Verify trimming happens in the API call
        await waitFor(() => {
            expect(createPlaybookRun).toHaveBeenCalledWith(
                'https://server-url.com',
                'playbook-id',
                'user-id',
                'team-id',
                'Test Run', // trimmed
                'Test Description', // trimmed
                undefined,
                undefined,
            );
        });
    });

    it('should handle close button press', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<StartARun {...props}/>);

        // Get the close button handler
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'close-start-a-run');
        const closeHandler = lastCall[2];

        act(() => {
            closeHandler();
        });

        expect(popTopScreen).toHaveBeenCalledWith('PlaybooksStartARun');
    });

    it('should handle Android back button press', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<StartARun {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            'PlaybooksStartARun',
            expect.any(Function),
        );

        // Get the back handler
        const backHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];

        act(() => {
            backHandler();
        });

        expect(popTopScreen).toHaveBeenCalledWith('PlaybooksStartARun');
    });

    it('should create run with existing channel and channel ID', async () => {
        const props = getBaseProps();
        const mockRun = TestHelper.fakePlaybookRun({id: 'run-id'});
        jest.mocked(createPlaybookRun).mockResolvedValue({data: mockRun});

        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const runNameInput = getByTestId('start_run.run_name_input');
        await act(async () => {
            runNameInput.props.onChangeText('Test Run');
        });

        // Select existing channel option
        const existingOption = getByTestId('start_run.existing_channel_option');
        await act(async () => {
            existingOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.existing_channel_selector')).toBeTruthy();
        });

        // Simulate channel selection
        const channelSelector = getByTestId('start_run.existing_channel_selector');
        await act(async () => {
            channelSelector.props.onSelected({value: 'channel-id'});
        });

        // Get the create button handler
        const lastCall = getLastCallForButton(jest.mocked(useNavButtonPressed), 'create-run');
        const createHandler = lastCall[2];

        // Simulate create button press
        await act(async () => {
            createHandler();
        });

        await waitFor(() => {
            expect(createPlaybookRun).toHaveBeenCalledWith(
                'https://server-url.com',
                'playbook-id',
                'user-id',
                'team-id',
                'Test Run',
                '',
                'channel-id',
                undefined,
            );
        });
    });

    it('should call setButtons with correct button configuration', async () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<StartARun {...props}/>);

        await waitFor(() => {
            expect(setButtons).toHaveBeenCalled();
        });

        const lastCall = getLastCall(jest.mocked(setButtons));
        expect(lastCall[0]).toBe('PlaybooksStartARun');
        expect(lastCall[1]?.leftButtons).toBeDefined();
        expect(lastCall[1]?.rightButtons).toBeDefined();
        expect(lastCall[1]?.leftButtons?.[0]?.id).toBe('close-start-a-run');
        expect(lastCall[1]?.rightButtons?.[0]?.id).toBe('create-run');
    });

    it('should hide existing channel selector when new channel option is selected', async () => {
        const props = getBaseProps();
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        // Select existing option first
        const existingOption = getByTestId('start_run.existing_channel_option');
        await act(async () => {
            existingOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.existing_channel_selector')).toBeTruthy();
        });

        // Select new channel option
        const newChannelOption = getByTestId('start_run.new_channel_option');
        await act(async () => {
            newChannelOption.props.action();
        });

        await waitFor(() => {
            expect(queryByTestId('start_run.existing_channel_selector')).toBeNull();
            expect(getByTestId('start_run.new_channel_public_option')).toBeTruthy();
        });
    });

    it('should hide new channel options when existing channel option is selected', async () => {
        const props = getBaseProps();
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        // Select new channel option first
        const newChannelOption = getByTestId('start_run.new_channel_option');
        await act(async () => {
            newChannelOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toBeTruthy();
        });

        // Select existing channel option
        const existingOption = getByTestId('start_run.existing_channel_option');
        await act(async () => {
            existingOption.props.action();
        });

        await waitFor(() => {
            expect(queryByTestId('start_run.new_channel_public_option')).toBeNull();
            expect(getByTestId('start_run.existing_channel_selector')).toBeTruthy();
        });
    });

    it('should default to existing channel option', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        expect(getByTestId('start_run.existing_channel_option')).toHaveProp('selected', true);
        expect(getByTestId('start_run.new_channel_option')).toHaveProp('selected', false);
    });

    it('should default to private channel when new channel is selected', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        // Select new channel option
        const newChannelOption = getByTestId('start_run.new_channel_option');
        await act(async () => {
            newChannelOption.props.action();
        });

        await waitFor(() => {
            expect(getByTestId('start_run.new_channel_public_option')).toHaveProp('selected', false);
            expect(getByTestId('start_run.new_channel_private_option')).toHaveProp('selected', true);
        });
    });

    it('should ignore multiselect case', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const channelSelector = getByTestId('start_run.existing_channel_selector');

        await act(async () => {
            // Set some initial value
            channelSelector.props.onSelected({value: 'valid-id', text: 'Valid Channel'});
        });

        await waitFor(() => {
            expect(channelSelector).toHaveProp('selected', 'valid-id');
        });

        await act(async () => {
            channelSelector.props.onSelected([{value: 'channel-id', text: 'Channel 1'}, {value: 'channel-id-2', text: 'Channel 2'}]);
        });

        await waitFor(() => {
            expect(channelSelector).toHaveProp('selected', 'valid-id');
        });
    });

    it('should ignore empty value case', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<StartARun {...props}/>);

        const channelSelector = getByTestId('start_run.existing_channel_selector');

        await act(async () => {
            // Set some initial value
            channelSelector.props.onSelected({value: 'valid-id', text: 'Valid Channel'});
        });

        await waitFor(() => {
            expect(channelSelector).toHaveProp('selected', 'valid-id');
        });

        await act(async () => {
            channelSelector.props.onSelected();
        });

        await waitFor(() => {
            expect(channelSelector).toHaveProp('selected', 'valid-id');
        });
    });
});

