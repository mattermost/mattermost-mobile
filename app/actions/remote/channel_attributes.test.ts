// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {setAccessControlGroupId} from '@actions/local/channel_attributes';
import {ACCESS_CONTROL_GROUP_NAME} from '@constants/channel_attributes';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {isPropertyValueSet} from '@utils/channel_attributes';

import {setChannelAttributeValue} from './channel_attributes';

import type {PropertyValueModel} from '@database/models/server';

const {PROPERTY_VALUE} = MM_TABLES.SERVER;

const serverUrl = 'channel-attributes.test.com';
const groupId = 'access-control-group-id';
const channelId = 'channel-id-1';
const otherChannelId = 'channel-id-2';

const mockClient = {
    patchPropertyValues: jest.fn(),
};

const value = (overrides: Partial<PropertyValue<unknown>>): PropertyValue<unknown> => ({
    id: 'value-id-1',
    field_id: 'field-id-1',
    target_id: channelId,
    target_type: 'channel',
    group_id: groupId,
    value: 'option-secret',
    create_at: 1000,
    update_at: 1000,
    delete_at: 0,
    ...overrides,
});

const storedValues = (database: Database, targetId: string) =>
    database.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('target_id', targetId)).fetch();

beforeAll(() => {
    // @ts-expect-error mock client
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    jest.clearAllMocks();
    await setAccessControlGroupId(serverUrl, groupId);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('setChannelAttributeValue', () => {
    it('should patch the value and persist the response', async () => {
        const upserted = value({value: 'option-secret'});
        mockClient.patchPropertyValues.mockResolvedValueOnce([upserted]);

        const result = await setChannelAttributeValue(serverUrl, channelId, 'field-id-1', 'option-secret');

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual([upserted]);
        expect(mockClient.patchPropertyValues).toHaveBeenCalledWith(
            ACCESS_CONTROL_GROUP_NAME,
            'channel',
            channelId,
            [{field_id: 'field-id-1', value: 'option-secret'}],
        );

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const stored = await storedValues(database, channelId);
        expect(stored).toHaveLength(1);
        expect(stored[0].value).toBe('option-secret');
    });

    it('should send an array value through unchanged for a multiselect', async () => {
        mockClient.patchPropertyValues.mockResolvedValueOnce([value({value: ['a', 'b']})]);

        await setChannelAttributeValue(serverUrl, channelId, 'field-id-1', ['a', 'b']);

        expect(mockClient.patchPropertyValues).toHaveBeenCalledWith(
            ACCESS_CONTROL_GROUP_NAME,
            'channel',
            channelId,
            [{field_id: 'field-id-1', value: ['a', 'b']}],
        );
    });

    it('should send an empty string, an empty list and null all as a clear', async () => {
        mockClient.patchPropertyValues.mockResolvedValue([value({value: null})]);

        await Promise.all([
            setChannelAttributeValue(serverUrl, channelId, 'field-id-1', ''),
            setChannelAttributeValue(serverUrl, channelId, 'field-id-1', []),
            setChannelAttributeValue(serverUrl, channelId, 'field-id-1', null),
        ]);

        expect(mockClient.patchPropertyValues).toHaveBeenCalledTimes(3);
        for (const call of mockClient.patchPropertyValues.mock.calls) {
            expect(call[3]).toEqual([{field_id: 'field-id-1', value: null}]);
        }
    });

    it('should persist a cleared value as unset rather than leaving the old one behind', async () => {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values: [value({value: 'option-secret'})], prepareRecordsOnly: false});

        // The server answers a clear with an upserted null-valued row, not a
        // delete event, so this is the shape the action has to cope with.
        mockClient.patchPropertyValues.mockResolvedValueOnce([value({value: null, update_at: 2000})]);

        await setChannelAttributeValue(serverUrl, channelId, 'field-id-1', null);

        // The row stays, carrying nothing. It is read back as undefined rather
        // than null because the column is JSON-decoded on read, which is why the
        // assertion is about what the surfaces ask — isPropertyValueSet — and not
        // about which flavour of empty landed in the column.
        const stored = await storedValues(database, channelId);
        expect(stored).toHaveLength(1);
        expect(isPropertyValueSet(stored[0].value)).toBe(false);
    });

    it('should leave the channel\'s other attribute values alone when one field is written', async () => {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({
            values: [
                value({id: 'value-id-1', field_id: 'field-id-1', value: 'option-secret'}),
                value({id: 'value-id-2', field_id: 'field-id-2', value: 'option-aurora'}),
            ],
            prepareRecordsOnly: false,
        });

        mockClient.patchPropertyValues.mockResolvedValueOnce([value({id: 'value-id-1', field_id: 'field-id-1', value: 'option-public', update_at: 2000})]);

        await setChannelAttributeValue(serverUrl, channelId, 'field-id-1', 'option-public');

        const stored = await storedValues(database, channelId);
        expect(stored).toHaveLength(2);
        expect(stored.find((v) => v.fieldId === 'field-id-2')?.value).toBe('option-aurora');
    });

    it('should not touch another channel\'s values', async () => {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({
            values: [value({id: 'value-id-3', target_id: otherChannelId, value: 'option-aurora'})],
            prepareRecordsOnly: false,
        });

        mockClient.patchPropertyValues.mockResolvedValueOnce([value({value: 'option-public'})]);

        await setChannelAttributeValue(serverUrl, channelId, 'field-id-1', 'option-public');

        expect(await storedValues(database, otherChannelId)).toHaveLength(1);
    });

    it('should not request anything when the access_control group id is not known yet', async () => {
        await setAccessControlGroupId(serverUrl, '');

        const result = await setChannelAttributeValue(serverUrl, channelId, 'field-id-1', 'option-secret');

        expect(result.error).toBeDefined();
        expect(mockClient.patchPropertyValues).not.toHaveBeenCalled();
    });

    it('should return the error and leave the stored value untouched when the server refuses the write', async () => {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handlePropertyValues({values: [value({value: 'option-secret'})], prepareRecordsOnly: false});

        mockClient.patchPropertyValues.mockRejectedValueOnce({status_code: 403, message: 'change policy does not permit this change'});

        const result = await setChannelAttributeValue(serverUrl, channelId, 'field-id-1', 'option-public');

        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();

        const stored = await storedValues(database, channelId);
        expect(stored).toHaveLength(1);
        expect(stored[0].value).toBe('option-secret');
    });

    it('should return an error when the server database is unknown', async () => {
        const result = await setChannelAttributeValue('not-a-server.test.com', channelId, 'field-id-1', 'option-secret');

        expect(result.error).toBeDefined();
        expect(mockClient.patchPropertyValues).not.toHaveBeenCalled();
    });
});
