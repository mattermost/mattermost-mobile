// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientPropertiesMix} from './properties';

describe('ClientProperties', () => {
    let client: ClientPropertiesMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    beforeEach(() => {
        (client.doFetch as jest.Mock).mockReset();
    });

    test('getPropertyValues', async () => {
        const groupName = 'managed_channel_categories';
        const objectType = 'channel';
        const targetId = 'channel_id_1';
        const expectedUrl = `${client.urlVersion}/properties/groups/${groupName}/${objectType}/values/${targetId}`;
        const expectedOptions = {method: 'get'};

        await client.getPropertyValues<string>(groupName, objectType, targetId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getPropertyFields', async () => {
        const groupName = 'managed_channel_categories';
        const objectType = 'channel';
        const targetType = 'system';
        const expectedUrl = `${client.urlVersion}/properties/groups/${groupName}/${objectType}/fields?target_type=${targetType}`;
        const expectedOptions = {method: 'get'};

        await client.getPropertyFields(groupName, objectType, targetType);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getPropertyFields should not append target_id when omitted', async () => {
        (client.doFetch as jest.Mock).mockResolvedValueOnce([]);

        await client.getPropertyFields('group', 'channel', 'system');

        const url = (client.doFetch as jest.Mock).mock.calls[0][0] as string;
        expect(url).not.toContain('target_id');
    });

    test('getPropertyFields should append target_id when provided', async () => {
        (client.doFetch as jest.Mock).mockResolvedValueOnce([]);

        await client.getPropertyFields('group', 'channel', 'system', 'tid');

        const url = (client.doFetch as jest.Mock).mock.calls[0][0] as string;
        expect(url).toContain('target_id=tid');
    });

    describe('should return [] when doFetch resolves to a non-array', () => {
        it('should return [] for getPropertyValues', async () => {
            (client.doFetch as jest.Mock).mockResolvedValueOnce({});
            const result = await client.getPropertyValues<string>('g', 'o', 't');
            expect(result).toEqual([]);
        });

        it('should return [] for getPropertyFields', async () => {
            (client.doFetch as jest.Mock).mockResolvedValueOnce({});
            const result = await client.getPropertyFields('g', 'o', 't');
            expect(result).toEqual([]);
        });

        it('should return [] for searchPropertyFields', async () => {
            (client.doFetch as jest.Mock).mockResolvedValueOnce({});
            const result = await client.searchPropertyFields('g', {object_types: []});
            expect(result).toEqual([]);
        });

        it('should return [] for getSystemPropertyValues', async () => {
            (client.doFetch as jest.Mock).mockResolvedValueOnce({});
            const result = await client.getSystemPropertyValues<string>('g');
            expect(result).toEqual([]);
        });

        it('should return [] for getPropertyValues when doFetch resolves to null', async () => {
            (client.doFetch as jest.Mock).mockResolvedValueOnce(null);
            const result = await client.getPropertyValues<string>('g', 'o', 't');
            expect(result).toEqual([]);
        });
    });

    describe('should pass through valid arrays', () => {
        it('should return the array for getPropertyValues', async () => {
            const data = [{id: 'v1'}];
            (client.doFetch as jest.Mock).mockResolvedValueOnce(data);
            const result = await client.getPropertyValues<string>('g', 'o', 't');
            expect(result).toEqual(data);
        });

        it('should return the array for getPropertyFields', async () => {
            const data = [{id: 'f1'}];
            (client.doFetch as jest.Mock).mockResolvedValueOnce(data);
            const result = await client.getPropertyFields('g', 'o', 't');
            expect(result).toEqual(data);
        });
    });
});
