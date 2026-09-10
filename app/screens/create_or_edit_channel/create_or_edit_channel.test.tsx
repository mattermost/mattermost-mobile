// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps, type ReactElement} from 'react';

import {createChannel} from '@actions/remote/channel';
import {bottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CreateOrEditChannel from './create_or_edit_channel';

import type ChannelAttributeEditor from '@components/channel_attribute_editor';
import type {Database} from '@nozbe/watermelondb';

const mockSetOptions = jest.fn();

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({
        setOptions: mockSetOptions,
        getParent: () => ({goBack: jest.fn()}),
    })),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn().mockResolvedValue(undefined),
}));

const mockedBottomSheet = jest.mocked(bottomSheet);

// The sheet renders in its own route, so what it was handed is inspected here and
// its callback invoked the way the sheet itself would invoke it. Mirrors the
// pattern in channel_info_attributes.test.tsx.
const sheetProps = () => (mockedBottomSheet.mock.calls[mockedBottomSheet.mock.calls.length - 1][0]() as ReactElement<ComponentProps<typeof ChannelAttributeEditor>>).props;

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@actions/remote/channel', () => ({
    createChannel: jest.fn(),
    patchChannel: jest.fn(),
    switchToChannelById: jest.fn(),
}));

jest.mock('@components/autocomplete', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

function lastHeaderButton() {
    const calls = mockSetOptions.mock.calls as Array<[{headerRight: () => React.ReactElement<{disabled: boolean; onPress: () => void; testID: string}>}]>;
    const headerRight = calls[calls.length - 1][0].headerRight;
    return headerRight();
}

describe('CreateOrEditChannel', () => {
    const serverUrl = 'https://example.com';
    let database: Database;

    function getBaseProps(): ComponentProps<typeof CreateOrEditChannel> {
        return {
            canCreatePublicChannels: true,
            canCreatePrivateChannels: true,
            attributeFields: [],
            attributesBlocked: false,
        };
    }

    function requiredField(overrides: Partial<ComponentProps<typeof CreateOrEditChannel>['attributeFields'][number]> = {}) {
        return {
            id: 'field-1',
            name: 'sensitivity',
            type: 'select',
            attrs: {required: true, options: [{id: 'opt-1', name: 'HIGH'}]},
            permissionValues: 'member',
            ...overrides,
        } as ComponentProps<typeof CreateOrEditChannel>['attributeFields'][number];
    }

    beforeEach(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await TestHelper.tearDown(serverUrl);
    });

    it('should keep the Create button enabled after a failed submit', async () => {
        let resolveCreateChannel: (value: Awaited<ReturnType<typeof createChannel>>) => void;
        const createChannelRequest = new Promise<Awaited<ReturnType<typeof createChannel>>>((resolve) => {
            resolveCreateChannel = resolve;
        });
        jest.mocked(createChannel).mockReturnValue(createChannelRequest);

        const {getByTestId} = renderWithEverything(
            <CreateOrEditChannel {...getBaseProps()}/>,
            {database, serverUrl},
        );

        act(() => {
            fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'town-square');
        });

        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(false);
        });

        await act(async () => {
            lastHeaderButton().props.onPress();
        });

        await waitFor(() => {
            expect(createChannel).toHaveBeenCalled();
            expect(lastHeaderButton().props.disabled).toBe(true);
        });

        await act(async () => {
            resolveCreateChannel({error: 'channel creation failed'});
            await createChannelRequest;
        });

        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(false);
            expect(lastHeaderButton().props.testID).toBe('create_or_edit_channel.create.button');
        });
    });

    it('should keep Create disabled until every required attribute is set', async () => {
        const {getByTestId, getByText} = renderWithEverything(
            <CreateOrEditChannel
                {...getBaseProps()}
                attributeFields={[requiredField()]}
            />,
            {database, serverUrl},
        );

        expect(getByText('Channel Attributes')).toBeTruthy();

        act(() => {
            fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'town-square');
        });

        // A valid display name alone is not enough: the required attribute is
        // still unset.
        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(true);
        });
    });

    it('should send the chosen attribute values on create', async () => {
        jest.mocked(createChannel).mockResolvedValue({channel: TestHelper.fakeChannel({id: 'created-channel', team_id: 'team1'})});

        const {getByTestId} = renderWithEverything(
            <CreateOrEditChannel
                {...getBaseProps()}
                attributeFields={[requiredField()]}
            />,
            {database, serverUrl},
        );

        act(() => {
            fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'town-square');
        });

        // Open the sheet, then submit the way the sheet itself would.
        fireEvent.press(getByTestId('channel_attribute_form.sensitivity.edit'));
        await act(async () => {
            await sheetProps().onSubmit('field-1', 'opt-1');
        });

        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(false);
        });

        await act(async () => {
            lastHeaderButton().props.onPress();
        });

        await waitFor(() => {
            expect(createChannel).toHaveBeenCalledWith(
                expect.any(String),
                'town-square',
                expect.any(String),
                expect.any(String),
                expect.any(String),
                [{field_id: 'field-1', value: 'opt-1'}],
            );
        });
    });

    it('should not submit an option removed after its editor opened', async () => {
        jest.mocked(createChannel).mockResolvedValue({channel: TestHelper.fakeChannel({id: 'created-channel', team_id: 'team1'})});
        const initialField = requiredField();
        const {getByTestId, rerender} = renderWithEverything(
            <CreateOrEditChannel
                {...getBaseProps()}
                attributeFields={[initialField]}
            />,
            {database, serverUrl},
        );

        fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'town-square');
        fireEvent.press(getByTestId('channel_attribute_form.sensitivity.edit'));
        const staleSubmit = sheetProps().onSubmit;

        rerender(
            <CreateOrEditChannel
                {...getBaseProps()}
                attributeFields={[requiredField({attrs: {required: true, options: [{id: 'opt-2', name: 'LOW'}]}})]}
            />,
        );
        await act(async () => {
            staleSubmit('field-1', 'opt-1');
        });

        await act(async () => {
            lastHeaderButton().props.onPress();
        });

        expect(createChannel).toHaveBeenCalledWith(
            expect.any(String),
            'town-square',
            expect.any(String),
            expect.any(String),
            expect.any(String),
            [],
        );
    });

    it('should not render the attribute section while editing', () => {
        const {queryByTestId} = renderWithEverything(
            <CreateOrEditChannel
                {...getBaseProps()}
                channel={TestHelper.fakeChannelModel({id: 'channel1'})}
                attributeFields={[requiredField()]}
            />,
            {database, serverUrl},
        );

        expect(queryByTestId('channel_attribute_form')).toBeNull();
    });

    it('should show a legible message when the server refuses a missing required attribute', async () => {
        jest.mocked(createChannel).mockResolvedValue({error: {server_error_id: 'api.channel.create_channel.missing_required_attributes.app_error'}});

        const {getByTestId, getByText} = renderWithEverything(
            <CreateOrEditChannel {...getBaseProps()}/>,
            {database, serverUrl},
        );

        act(() => {
            fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'town-square');
        });

        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(false);
        });

        await act(async () => {
            lastHeaderButton().props.onPress();
        });

        await waitFor(() => {
            expect(getByText('This channel is missing a required attribute. Check the channel attributes above and try again.')).toBeTruthy();
        });
    });

    it('should disable Create and explain when a required attribute has no mobile editor', async () => {
        const {getByTestId, getByText} = renderWithEverything(
            <CreateOrEditChannel
                {...getBaseProps()}
                attributesBlocked={true}
            />,
            {database, serverUrl},
        );

        act(() => {
            fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'town-square');
        });

        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(true);
            expect(getByText('A required channel attribute cannot be set from this device yet. Ask an administrator to create this channel from a computer.')).toBeTruthy();
        });

        expect(createChannel).not.toHaveBeenCalled();
    });

    it('should not block editing an existing channel even when attributesBlocked is true', async () => {
        const {getByTestId} = renderWithEverything(
            <CreateOrEditChannel
                {...getBaseProps()}
                channel={TestHelper.fakeChannelModel({id: 'channel1', displayName: 'old-name'})}
                attributesBlocked={true}
            />,
            {database, serverUrl},
        );

        act(() => {
            fireEvent.changeText(getByTestId('channel_info_form.display_name.input'), 'new-name');
        });

        await waitFor(() => {
            expect(lastHeaderButton().props.disabled).toBe(false);
        });
    });
});
