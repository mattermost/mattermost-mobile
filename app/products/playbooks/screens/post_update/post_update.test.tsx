// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {act, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {Alert, Keyboard} from 'react-native';

import {getPosts} from '@actions/local/post';
import FloatingAutocompleteSelector from '@components/floating_input/floating_autocomplete_selector';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import OptionItem from '@components/option_item';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {fetchPlaybookRun, fetchPlaybookRunMetadata, postStatusUpdate} from '@playbooks/actions/remote/runs';
import {popTopScreen, setButtons} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PostUpdate from './post_update';

jest.mock('@components/floating_input/floating_text_input_label', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingTextInput).mockImplementation((props) => React.createElement('FloatingTextInput', {testID: 'FloatingTextInput', ...props}));

jest.mock('@components/floating_input/floating_autocomplete_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FloatingAutocompleteSelector).mockImplementation((props) => React.createElement('FloatingAutocompleteSelector', props));

jest.mock('@components/option_item', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(OptionItem).mockImplementation((props) => React.createElement('OptionItem', {...props}));

jest.mock('@actions/local/post', () => ({
    getPosts: jest.fn(),
}));

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
    fetchPlaybookRun: jest.fn(),
    fetchPlaybookRunMetadata: jest.fn(),
    postStatusUpdate: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showPlaybookErrorSnackbar: jest.fn(),
}));

jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    return {
        ...RN,
        Keyboard: {
            dismiss: jest.fn(),
        },
        Alert: {
            alert: jest.fn(),
        },
    };
});

function getLastCall<T, U extends any[], V>(mock: jest.Mock<T, U, V>): U {
    const allCalls = mock.mock.calls;
    return allCalls[allCalls.length - 1];
}

describe('PostUpdate', () => {
    function getBaseProps(): ComponentProps<typeof PostUpdate> {
        return {
            componentId: 'PlaybookPostUpdate',
            playbookRunId: 'playbook-run-id',
            runName: 'Test Run',
            userId: 'user-id',
            channelId: 'channel-id',
            teamId: 'team-id',
            outstanding: 0,
        };
    }

    const mockMetadata: PlaybookRunMetadata = {
        followers: ['follower-1', 'follower-2'],
        channel_name: 'channel-name',
        channel_display_name: 'channel-display-name',
        team_name: 'team-name',
        num_participants: 10,
        total_posts: 100,
    };

    const mockRun = TestHelper.fakePlaybookRun({
        id: 'playbook-run-id',
        status_update_broadcast_channels_enabled: true,
        broadcast_channel_ids: ['channel-1', 'channel-2'],
        reminder_message_template: 'Default message template',
        status_posts: [],
    });

    const mockPost = TestHelper.fakePostModel({
        id: 'post-id',
        message: 'Last status post message',
        createAt: Date.now(),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(fetchPlaybookRunMetadata).mockResolvedValue({metadata: mockMetadata});
        jest.mocked(fetchPlaybookRun).mockResolvedValue({run: mockRun});
        jest.mocked(getPosts).mockResolvedValue([mockPost]);
        jest.mocked(postStatusUpdate).mockResolvedValue({data: true});
    });

    it('should render loading state initially', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        expect(getByTestId('loader')).toBeTruthy();
    });

    it('should render correctly after loading', async () => {
        const props = getBaseProps();
        const {getByText, getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByText(/This update for the checklist/)).toBeTruthy();
            const input = getByTestId('FloatingTextInput');
            expect(input).toHaveProp('value', 'Default message template');
            expect(input).toHaveProp('label', 'Update message');
            expect(input).toHaveProp('placeholder', 'Enter your update message');
            expect(input).toHaveProp('multiline', true);

            const selector = getByTestId('playbooks.post_update.selector');
            expect(selector).toHaveProp('selected', '15_minutes');
            expect(selector).toHaveProp('label', 'Timer for next update');
            expect(selector).toHaveProp('options', expect.arrayContaining([
                expect.objectContaining({value: '15_minutes', text: '15 minutes'}),
                expect.objectContaining({value: '30_minutes', text: '30 minutes'}),
                expect.objectContaining({value: '1_hour', text: '1 hour'}),
                expect.objectContaining({value: '4_hours', text: '4 hours'}),
                expect.objectContaining({value: '1_day', text: '1 day'}),
                expect.objectContaining({value: '7_days', text: '7 days'}),
            ]));
            expect(selector.props.options).toHaveLength(6);

            const toggle = getByTestId('playbooks.post_update.selector.also_mark_run_as_finished');
            expect(toggle).toHaveProp('label', 'Also mark the checklist as finished');
            expect(toggle).toHaveProp('selected', false);
            expect(toggle).toHaveProp('type', 'toggle');
        });
    });

    it('should load default message from reminder_message_template', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            const input = getByTestId('FloatingTextInput');
            expect(input).toHaveProp('value', 'Default message template');
        });
    });

    it('should load default message from last status post when available', async () => {
        const props = getBaseProps();
        const runWithStatusPost = TestHelper.fakePlaybookRun({
            id: 'playbook-run-id',
            status_posts: [{
                id: 'status-post-id',
                create_at: Date.now(),
                delete_at: 0,
            }],
        });

        jest.mocked(fetchPlaybookRun).mockResolvedValue({run: runWithStatusPost});
        jest.mocked(getPosts).mockResolvedValue([mockPost]);

        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            const input = getByTestId('FloatingTextInput');
            expect(input.props.value).toBe('Last status post message');
        });
    });

    it('should display correct intro message when no followers and no broadcast channels', async () => {
        const props = getBaseProps();
        jest.mocked(fetchPlaybookRunMetadata).mockResolvedValue({metadata: {followers: [], channel_name: '', channel_display_name: '', team_name: '', num_participants: 0, total_posts: 0}});
        jest.mocked(fetchPlaybookRun).mockResolvedValue({
            run: {
                ...mockRun,
                status_update_broadcast_channels_enabled: false,
            },
        });

        const {getByText} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByText('This update will be saved to the overview page.')).toBeTruthy();
        });
    });

    it('should display correct intro message with followers and broadcast channels', async () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByText('This update for the checklist Test Run will be broadcasted to 2 channels and 2 direct messages.')).toBeTruthy();
        });
    });

    it('should update message when text input changes', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector')).toBeTruthy();
        });

        const input = getByTestId('FloatingTextInput');
        await act(async () => {
            input.props.onChangeText('New update message');
        });

        await waitFor(() => {
            const updatedInput = getByTestId('FloatingTextInput');
            expect(updatedInput).toHaveProp('value', 'New update message');
        });
    });

    it('should enable save button when message has content', async () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(setButtons).toHaveBeenCalled();
        });

        const lastCall = jest.mocked(setButtons).mock.calls[jest.mocked(setButtons).mock.calls.length - 1];
        const rightButton = lastCall[1]?.rightButtons?.[0];
        expect(rightButton?.enabled).toBe(true);
    });

    it('should disable save button when message is empty', async () => {
        const props = getBaseProps();
        jest.mocked(fetchPlaybookRun).mockResolvedValue({
            run: {
                ...mockRun,
                status_posts: [],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            const input = getByTestId('FloatingTextInput');
            expect(input).toHaveProp('value', 'Default message template');
            const lastCall = getLastCall(jest.mocked(setButtons));
            const rightButton = lastCall[1]?.rightButtons?.[0];
            expect(rightButton?.enabled).toBe(true);
        });

        const input = getByTestId('FloatingTextInput');
        await act(async () => {
            input.props.onChangeText('');
        });

        await waitFor(() => {
            const lastCall = getLastCall(jest.mocked(setButtons));
            const rightButton = lastCall[1]?.rightButtons?.[0];
            expect(rightButton?.enabled).toBe(false);
        });
    });

    it('should change next update value when selector changes', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector')).toBeTruthy();
        });

        const selector = getByTestId('playbooks.post_update.selector');

        await act(async () => {
            selector.props.onSelected({value: '1_hour'});
        });

        await waitFor(() => {
            const updatedSelector = getByTestId('playbooks.post_update.selector');
            expect(updatedSelector).toHaveProp('selected', '1_hour');
        });
    });

    it('should ignore multiselect value from selector', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            const selector = getByTestId('playbooks.post_update.selector');
            expect(selector).toBeTruthy();
            expect(selector).toHaveProp('selected', '15_minutes');
        });

        const selector = getByTestId('playbooks.post_update.selector');
        await act(async () => {
            selector.props.onSelected([{value: '1_hour', text: '1 hour'}, {value: '30_minutes', text: '30 minutes'}]);
        });

        await waitFor(() => {
            const updatedSelector = getByTestId('playbooks.post_update.selector');
            expect(updatedSelector).toHaveProp('selected', '15_minutes');
        });
    });

    it('should ignore empty value from selector', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            const selector = getByTestId('playbooks.post_update.selector');
            expect(selector).toBeTruthy();
            expect(selector).toHaveProp('selected', '15_minutes');
        });

        const selector = getByTestId('playbooks.post_update.selector');
        await act(async () => {
            selector.props.onSelected();
        });

        await waitFor(() => {
            const updatedSelector = getByTestId('playbooks.post_update.selector');
            expect(updatedSelector).toHaveProp('selected', '15_minutes');
        });
    });

    it('should toggle also mark run as finished option', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector.also_mark_run_as_finished')).toBeTruthy();
        });

        const toggle = getByTestId('playbooks.post_update.selector.also_mark_run_as_finished');

        expect(toggle).toHaveProp('selected', false);

        await act(async () => {
            toggle.props.action(true);
        });

        await waitFor(() => {
            const updatedToggle = getByTestId('playbooks.post_update.selector.also_mark_run_as_finished');
            expect(updatedToggle).toHaveProp('selected', true);
        });
    });

    it('should post update without confirmation when alsoMarkRunAsFinished is false', async () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(setButtons).toHaveBeenCalled();
        });

        const lastCall = getLastCall(jest.mocked(useNavButtonPressed));
        const postHandler = lastCall[2];

        await act(async () => {
            postHandler();
        });

        await waitFor(() => {
            expect(postStatusUpdate).toHaveBeenCalledWith(
                'https://server-url.com',
                'playbook-run-id',
                {
                    message: 'Default message template',
                    reminder: 900, // 15 minutes in seconds
                    finishRun: false,
                },
                {
                    user_id: 'user-id',
                    channel_id: 'channel-id',
                    team_id: 'team-id',
                },
            );
            expect(popTopScreen).toHaveBeenCalledWith('PlaybookPostUpdate');
            expect(Keyboard.dismiss).toHaveBeenCalled();
        });
    });

    it('should show confirmation alert when alsoMarkRunAsFinished is true', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector.also_mark_run_as_finished')).toBeTruthy();
        });

        const toggle = getByTestId('playbooks.post_update.selector.also_mark_run_as_finished');

        await act(async () => {
            toggle.props.action(true);
        });

        const lastCall = getLastCall(jest.mocked(useNavButtonPressed));
        const postHandler = lastCall[2];

        await act(async () => {
            postHandler();
        });

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'Confirm finish checklist',
                'Are you sure you want to finish the checklist Test Run for all participants?',
                expect.arrayContaining([
                    expect.objectContaining({
                        text: 'Cancel',
                        style: 'cancel',
                    }),
                    expect.objectContaining({
                        text: 'Finish',
                    }),
                ]),
            );
        });
    });

    it('should show confirmation alert with outstanding tasks message', async () => {
        const props = {
            ...getBaseProps(),
            outstanding: 3,
        };
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector.also_mark_run_as_finished')).toBeTruthy();
        });

        const toggle = getByTestId('playbooks.post_update.selector.also_mark_run_as_finished');

        await act(async () => {
            toggle.props.action(true);
        });

        const lastCall = getLastCall(jest.mocked(useNavButtonPressed));
        const postHandler = lastCall[2];
        await act(async () => {
            postHandler();
        });

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'Confirm finish checklist',
                'There are 3 outstanding tasks. Are you sure you want to finish the checklist Test Run for all participants?',
                expect.arrayContaining([
                    expect.objectContaining({
                        text: 'Cancel',
                        style: 'cancel',
                    }),
                    expect.objectContaining({
                        text: 'Finish',
                    }),
                ]),
            );
        });
    });

    it('should call postStatusUpdate with correct parameters when confirmed', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector.also_mark_run_as_finished')).toBeTruthy();
        });

        const toggle = getByTestId('playbooks.post_update.selector.also_mark_run_as_finished');

        await act(async () => {
            toggle.props.action(true);
        });

        const lastCall = getLastCall(jest.mocked(useNavButtonPressed));
        const postHandler = lastCall[2];
        await act(async () => {
            postHandler();
        });

        // Simulate alert confirm button press
        const alertCall = jest.mocked(Alert.alert).mock.calls[0];
        const confirmButton = alertCall[2]?.find((button) => button.text === 'Finish');

        await act(async () => {
            confirmButton?.onPress?.();
        });

        await waitFor(() => {
            expect(postStatusUpdate).toHaveBeenCalledWith(
                'https://server-url.com',
                'playbook-run-id',
                {
                    message: 'Default message template',
                    reminder: 900,
                    finishRun: true,
                },
                {
                    user_id: 'user-id',
                    channel_id: 'channel-id',
                    team_id: 'team-id',
                },
            );
        });
    });

    it('should handle postStatusUpdate error', async () => {
        const props = getBaseProps();
        const {showPlaybookErrorSnackbar} = require('@utils/snack_bar');
        jest.mocked(postStatusUpdate).mockResolvedValue({error: new Error('Error posting update')});

        renderWithIntlAndTheme(<PostUpdate {...props}/>);

        const lastCall = getLastCall(jest.mocked(useNavButtonPressed));
        const postHandler = lastCall[2];
        await act(async () => {
            postHandler();
        });

        await waitFor(() => {
            expect(showPlaybookErrorSnackbar).toHaveBeenCalled();
        });
    });

    it('should handle missing channelId gracefully', async () => {
        const props = {
            ...getBaseProps(),
            channelId: undefined,
        };
        const {logDebug} = require('@utils/log');

        renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            const postHandler = jest.mocked(useNavButtonPressed).mock.calls.find(
                (call) => call[0] === 'save-post-update',
            )?.[2];

            postHandler?.();
        });

        await waitFor(() => {
            expect(logDebug).toHaveBeenCalledWith('cannot post status update without a channel id');
            expect(postStatusUpdate).not.toHaveBeenCalled();
        });
    });

    it('should handle fetchPlaybookRunMetadata error', async () => {
        const props = getBaseProps();
        const {logDebug} = require('@utils/log');
        jest.mocked(fetchPlaybookRunMetadata).mockResolvedValue({error: 'Metadata fetch error'});

        renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(logDebug).toHaveBeenCalledWith('error on fetchPlaybookRunMetadata', 'Metadata fetch error');
        });
    });

    it('should handle fetchPlaybookRun error', async () => {
        const props = getBaseProps();
        const {logDebug} = require('@utils/log');
        jest.mocked(fetchPlaybookRun).mockResolvedValue({error: 'Run fetch error'});

        renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(logDebug).toHaveBeenCalledWith('error on fetchPlaybookRun', 'Run fetch error');
        });
    });

    it('should handle Android back button press', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<PostUpdate {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            'PlaybookPostUpdate',
            expect.any(Function),
        );

        const backHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];

        act(() => {
            backHandler();
        });

        expect(popTopScreen).toHaveBeenCalled();
        expect(Keyboard.dismiss).toHaveBeenCalled();
    });

    it('should update reminder value correctly for different time options', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector')).toBeTruthy();
        });

        const selector = getByTestId('playbooks.post_update.selector');
        const timeOptions = [
            {value: '30_minutes', expected: 1800},
            {value: '1_hour', expected: 3600},
            {value: '4_hours', expected: 14400},
            {value: '1_day', expected: 86400},
            {value: '7_days', expected: 604800},
        ];

        for (const option of timeOptions) {
            // eslint-disable-next-line no-await-in-loop
            await act(async () => {
                selector.props.onSelected({value: option.value});
            });

            const lastCall = getLastCall(jest.mocked(useNavButtonPressed));
            const postHandler = lastCall[2];

            // eslint-disable-next-line no-await-in-loop
            await act(async () => {
                postHandler();
            });

            // eslint-disable-next-line no-await-in-loop
            await waitFor(() => {
                expect(postStatusUpdate).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.any(String),
                    expect.objectContaining({
                        reminder: option.expected,
                    }),
                    expect.any(Object),
                );
            });

            jest.clearAllMocks();
        }
    });

    it('should ignore deleted status posts when loading default message', async () => {
        const props = getBaseProps();
        const runWithDeletedStatusPost = TestHelper.fakePlaybookRun({
            id: 'playbook-run-id',
            reminder_message_template: 'Template message',
            status_posts: [
                {
                    id: 'deleted-post-id',
                    create_at: Date.now(),
                    delete_at: Date.now(),
                },
                {
                    id: 'valid-post-id',
                    create_at: Date.now(),
                    delete_at: 0,
                },
            ],
        });

        jest.mocked(fetchPlaybookRun).mockResolvedValue({run: runWithDeletedStatusPost});
        const validPost = TestHelper.fakePostModel({
            id: 'valid-post-id',
            message: 'Valid post message',
            createAt: Date.now(),
        });
        jest.mocked(getPosts).mockResolvedValue([validPost]);

        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            const input = getByTestId('FloatingTextInput');
            expect(input).toHaveProp('value', 'Valid post message');
        });
    });

    it('should use the reminder template if it cannot fetch the post', async () => {
        const props = getBaseProps();
        const runWithStatusPosts = TestHelper.fakePlaybookRun({
            id: 'playbook-run-id',
            reminder_message_template: 'Reminder template',
            status_posts: [{id: 'status-post-id', create_at: Date.now(), delete_at: 0}],
        });
        jest.mocked(fetchPlaybookRun).mockResolvedValue({run: runWithStatusPosts});
        jest.mocked(getPosts).mockResolvedValue([]);
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);
        await waitFor(() => {
            expect(getByTestId('FloatingTextInput')).toHaveProp('value', 'Reminder template');
        });
    });

    it('should not call postStatusUpdate when alert is cancelled', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<PostUpdate {...props}/>);

        await waitFor(() => {
            expect(getByTestId('playbooks.post_update.selector.also_mark_run_as_finished')).toBeTruthy();
        });

        const toggle = getByTestId('playbooks.post_update.selector.also_mark_run_as_finished');

        await act(async () => {
            toggle.props.action(true);
        });

        const lastCall = getLastCall(jest.mocked(useNavButtonPressed));
        const postHandler = lastCall[2];
        await act(async () => {
            postHandler();
        });

        // Simulate alert cancel button press
        const alertCall = jest.mocked(Alert.alert).mock.calls[0];
        const cancelButton = alertCall[2]?.find((button) => button.text === 'Cancel');

        await act(async () => {
            cancelButton?.onPress?.();
        });

        await waitFor(() => {
            expect(postStatusUpdate).not.toHaveBeenCalled();
        });
    });
});

