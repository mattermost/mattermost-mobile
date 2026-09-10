// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps, type ReactElement} from 'react';

import {setChannelAttributeValue} from '@actions/remote/channel_attributes';
import DatabaseManager from '@database/manager';
import {bottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';

import ChannelInfoAttributes from './channel_info_attributes';

import type ChannelAttributeEditor from '@components/channel_attribute_editor';
import type {Database} from '@nozbe/watermelondb';
import type {ChannelAttributeField, ChannelAttributePermissions, ResolvedChannelAttribute} from '@utils/channel_attributes';

jest.mock('@actions/remote/channel_attributes', () => ({
    setChannelAttributeValue: jest.fn().mockResolvedValue({}),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn().mockResolvedValue(undefined),
}));

const mockedSetValue = jest.mocked(setChannelAttributeValue);
const mockedBottomSheet = jest.mocked(bottomSheet);

const serverUrl = 'channel-info-attributes.test.com';
const channelId = 'channel-1';

let database: Database;

const OPTIONS = [
    {id: 'level-public', name: 'Public', color: '#00FF00', rank: 1},
    {id: 'level-secret', name: 'Secret', color: '#FF0000', rank: 2},
];

const field = (overrides: Partial<ChannelAttributeField> = {}): ChannelAttributeField => ({
    id: 'cf-1',
    name: 'classification',
    type: 'rank',
    attrs: {options: OPTIONS, actions: ['display_label_info']},
    permissionValues: 'member',
    ...overrides,
} as ChannelAttributeField);

const attribute = (overrides: Partial<ResolvedChannelAttribute> = {}): ResolvedChannelAttribute => ({
    field: field(),
    rawValue: 'level-secret',
    option: OPTIONS[1],
    displayValue: 'Secret',
    ...overrides,
});

const permissions = (overrides: Partial<ChannelAttributePermissions> = {}): ChannelAttributePermissions => ({
    canManageChannelProperties: true,
    canManageChannelRoles: false,
    canManageSystem: false,
    ...overrides,
});

const render = (attributes: ResolvedChannelAttribute[], perms = permissions()) => renderWithEverything(
    <ChannelInfoAttributes
        channelId={channelId}
        attributes={attributes}
        permissions={perms}
    />,
    {database, serverUrl},
);

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    jest.clearAllMocks();
    mockedSetValue.mockResolvedValue({});
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

// The sheet renders in its own route, so what it was handed is inspected here and
// its callback invoked the way the sheet itself would invoke it.
const sheetPropsAt = (index: number) => (mockedBottomSheet.mock.calls[index][0]() as ReactElement<ComponentProps<typeof ChannelAttributeEditor>>).props;
const sheetProps = () => sheetPropsAt(0);

const submitFromSheet = (fieldId: string, value: string | string[] | null) => act(async () => {
    await sheetProps().onSubmit(fieldId, value);
});

describe('ChannelInfoAttributes', () => {
    it('should render nothing when there are no attributes to list', () => {
        const {queryByTestId} = render([]);

        expect(queryByTestId('channel_info.attributes')).toBeNull();
    });

    it('should render a row per attribute, with its value as a chip', () => {
        const {getByTestId} = render([attribute()]);

        expect(getByTestId('channel_info.attributes')).toBeTruthy();
        expect(getByTestId('channel_info.attributes.classification')).toBeTruthy();
        expect(getByTestId('channel_info.attributes.classification.chip')).toBeTruthy();
    });

    it('should render Not set for a required attribute with no value', () => {
        const required = field({attrs: {options: OPTIONS, actions: ['display_label_info'], required: true}});
        const {getByTestId} = render([attribute({field: required, rawValue: undefined, option: undefined, displayValue: ''})]);

        expect(getByTestId('channel_info.attributes.classification.not_set')).toBeTruthy();
    });

    it('should make an editable row pressable', () => {
        const {getByTestId} = render([attribute()]);

        expect(getByTestId('channel_info.attributes.classification.edit')).toBeTruthy();
    });

    it('should not make a row pressable without the channel permission', () => {
        const {queryByTestId} = render([attribute()], permissions({canManageChannelProperties: false}));

        expect(queryByTestId('channel_info.attributes.classification.edit')).toBeNull();
    });

    it('should not make a row pressable when the field tier denies it', () => {
        const sysadminOnly = field({permissionValues: 'sysadmin'});
        const {queryByTestId} = render([attribute({field: sysadminOnly})]);

        expect(queryByTestId('channel_info.attributes.classification.edit')).toBeNull();
    });

    it('should make a sysadmin-tier row pressable for someone holding manage_system', () => {
        const sysadminOnly = field({permissionValues: 'sysadmin'});
        const {getByTestId} = render([attribute({field: sysadminOnly})], permissions({canManageSystem: true}));

        expect(getByTestId('channel_info.attributes.classification.edit')).toBeTruthy();
    });

    describe('lock reasons', () => {
        it('should explain a never policy on a value that is already set', () => {
            const locked = field({attrs: {options: OPTIONS, actions: ['display_label_info'], change_policy: 'never'}});
            const {getByTestId} = render([attribute({field: locked})]);

            expect(getByTestId('channel_info.attributes.classification.lock')).toBeTruthy();
        });

        it('should explain an exhausted directional policy', () => {
            const raiseOnly = field({attrs: {options: OPTIONS, actions: ['display_label_info'], change_policy: 'raise_only'}});
            const {getByText} = render([attribute({field: raiseOnly})]);

            expect(getByText('This attribute can only be raised, never lowered')).toBeTruthy();
        });

        it('should not explain a never policy before the first write, which the server allows', () => {
            const locked = field({attrs: {options: OPTIONS, actions: ['display_label_info'], change_policy: 'never'}});
            const {queryByTestId, getByTestId} = render([attribute({field: locked, rawValue: undefined, option: undefined, displayValue: ''})]);

            expect(queryByTestId('channel_info.attributes.classification.lock')).toBeNull();
            expect(getByTestId('channel_info.attributes.classification.edit')).toBeTruthy();
        });

        it('should explain a tier denial beside a row the viewer can edit, where the distinction means something', () => {
            const sysadminOnly = field({id: 'cf-2', name: 'program', permissionValues: 'sysadmin'});
            const {getByTestId} = render([
                attribute(),
                attribute({field: sysadminOnly}),
            ]);

            expect(getByTestId('channel_info.attributes.program.lock')).toBeTruthy();
            expect(getByTestId('channel_info.attributes.classification.edit')).toBeTruthy();
        });

        it('should not explain a permission lock when no row is editable, which is the common member view', () => {
            // The System Console pins the tier to admin, and ordinary members hold the
            // channel permission, so every row denied is the usual case rather than an
            // edge one. A notice per row would be noise.
            const adminTier = field({permissionValues: 'admin'});
            const {queryByTestId} = render([attribute({field: adminTier})]);

            expect(queryByTestId('channel_info.attributes.classification.lock')).toBeNull();
        });

        it('should not explain a permission lock to someone without the channel permission either', () => {
            const {queryByTestId} = render([attribute()], permissions({canManageChannelProperties: false}));

            expect(queryByTestId('channel_info.attributes.classification.lock')).toBeNull();
        });

        it('should explain an unsupported field type beside an editable row', () => {
            const dateField = field({id: 'cf-2', name: 'reviewed', type: 'date'});
            const {getByText} = render([
                attribute(),
                attribute({field: dateField, displayValue: '2026-01-01'}),
            ]);

            expect(getByText('This attribute cannot be changed on mobile')).toBeTruthy();
        });

        it('should still explain a policy lock when nothing on the channel is editable', () => {
            // A policy lock describes the channel, not the viewer, so it is worth a line
            // whoever is reading.
            const locked = field({attrs: {options: OPTIONS, actions: ['display_label_info'], change_policy: 'never'}});
            const {getByTestId} = render([attribute({field: locked})], permissions({canManageChannelProperties: false}));

            expect(getByTestId('channel_info.attributes.classification.lock')).toBeTruthy();
        });
    });

    describe('editing', () => {
        it('should open a sheet when an editable row is pressed', () => {
            const {getByTestId} = render([attribute()]);

            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));

            expect(mockedBottomSheet).toHaveBeenCalledTimes(1);
        });

        it('should write the chosen value through the action', async () => {
            const {getByTestId} = render([attribute()]);
            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));

            await submitFromSheet('cf-1', 'level-public');

            expect(mockedSetValue).toHaveBeenCalledWith(serverUrl, channelId, 'cf-1', 'level-public');
        });

        it('should report a failed save beside the row that asked for it', async () => {
            mockedSetValue.mockResolvedValueOnce({error: 'forbidden'});

            const {getByTestId, queryByTestId} = render([attribute()]);
            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));

            await submitFromSheet('cf-1', 'level-public');

            await waitFor(() => expect(getByTestId('channel_info.attributes.classification.error')).toBeTruthy());

            // The row keeps the value it had: nothing was written optimistically.
            expect(queryByTestId('channel_info.attributes.classification.chip')).toBeTruthy();
        });

        it('should report nothing when the save succeeds', async () => {
            const {getByTestId, queryByTestId} = render([attribute()]);
            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));

            await submitFromSheet('cf-1', 'level-public');

            expect(mockedSetValue).toHaveBeenCalled();
            expect(queryByTestId('channel_info.attributes.classification.error')).toBeNull();
        });

        it('should keep one field\'s failure independent of a different field\'s concurrent success', async () => {
            let resolveFirst: (result: {error?: string}) => void = () => {};
            const firstSave = new Promise<{error?: string}>((resolve) => {
                resolveFirst = resolve;
            });
            mockedSetValue.mockImplementationOnce(() => firstSave);
            mockedSetValue.mockResolvedValueOnce({});

            const program = field({id: 'cf-2', name: 'program'});
            const {getByTestId, queryByTestId} = render([
                attribute(),
                attribute({field: program}),
            ]);

            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));
            let firstSubmit: void;
            act(() => {
                firstSubmit = sheetPropsAt(0).onSubmit('cf-1', 'level-public');
            });

            fireEvent.press(getByTestId('channel_info.attributes.program.edit'));
            await act(async () => {
                await sheetPropsAt(1).onSubmit('cf-2', 'level-public');
            });

            await act(async () => {
                resolveFirst({error: 'forbidden'});
                await firstSubmit;
            });

            expect(getByTestId('channel_info.attributes.classification.error')).toBeTruthy();
            expect(queryByTestId('channel_info.attributes.program.error')).toBeNull();
        });

        it('should serialize two submits to the same field, so the server sees them in submission order', async () => {
            let resolveFirst: (result: {error?: string}) => void = () => {};
            const firstSave = new Promise<{error?: string}>((resolve) => {
                resolveFirst = resolve;
            });
            mockedSetValue.mockImplementationOnce(() => firstSave);
            mockedSetValue.mockResolvedValueOnce({});

            const {getByTestId} = render([attribute()]);

            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));
            let firstSubmit: void;
            await act(async () => {
                firstSubmit = sheetPropsAt(0).onSubmit('cf-1', 'level-public');

                // The write itself is chained through a microtask (see pendingWrites
                // in channel_info_attributes.tsx), so it has not reached the mock yet
                // when this synchronous call returns. Flush it before asserting.
                await Promise.resolve();
            });

            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));
            let secondSubmit: void;
            act(() => {
                secondSubmit = sheetPropsAt(1).onSubmit('cf-1', 'level-secret');
            });

            // The second write is chained behind the still-pending first one: it
            // must not have reached the server yet. Without the queue, both would
            // fire immediately and could arrive at the server in either order.
            expect(mockedSetValue).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolveFirst({});
                await firstSubmit;
                await secondSubmit;
            });

            expect(mockedSetValue).toHaveBeenCalledTimes(2);
            expect(mockedSetValue).toHaveBeenLastCalledWith(serverUrl, channelId, 'cf-1', 'level-secret');
        });

        it('should not offer a clear under a directional policy, which the server would refuse', () => {
            const raiseOnly = field({attrs: {options: OPTIONS, actions: ['display_label_info'], change_policy: 'raise_only'}});
            const {getByTestId} = render([attribute({field: raiseOnly, rawValue: 'level-public', option: OPTIONS[0], displayValue: 'Public'})]);

            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));

            expect(sheetProps().clearable).toBe(false);
        });

        it('should offer a clear on an any policy', () => {
            const anyPolicy = field({attrs: {options: OPTIONS, actions: ['display_label_info'], change_policy: 'any'}});
            const {getByTestId} = render([attribute({field: anyPolicy})]);

            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));

            expect(sheetProps().clearable).toBe(true);
        });

        it('should not offer a clear on a required field', () => {
            const required = field({attrs: {options: OPTIONS, actions: ['display_label_info'], required: true}});
            const {getByTestId} = render([attribute({field: required})]);

            fireEvent.press(getByTestId('channel_info.attributes.classification.edit'));

            expect(sheetProps().clearable).toBe(false);
        });

        it('should reject a sheet submission after live permissions revoke editing', async () => {
            const currentAttribute = attribute();
            const result = render([currentAttribute]);
            fireEvent.press(result.getByTestId('channel_info.attributes.classification.edit'));

            result.rerender(
                <ChannelInfoAttributes
                    channelId={channelId}
                    attributes={[currentAttribute]}
                    permissions={permissions({canManageChannelProperties: false})}
                />,
            );
            await submitFromSheet('cf-1', 'level-public');

            expect(mockedSetValue).not.toHaveBeenCalled();
        });

        it('should reject an option removed while its sheet was open', async () => {
            const currentAttribute = attribute();
            const result = render([currentAttribute]);
            fireEvent.press(result.getByTestId('channel_info.attributes.classification.edit'));

            const updatedField = field({attrs: {options: [OPTIONS[0]], actions: ['display_label_info']}});
            result.rerender(
                <ChannelInfoAttributes
                    channelId={channelId}
                    attributes={[attribute({field: updatedField})]}
                    permissions={permissions()}
                />,
            );
            await submitFromSheet('cf-1', 'level-secret');

            expect(mockedSetValue).not.toHaveBeenCalled();
        });
    });
});
