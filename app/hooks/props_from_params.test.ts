// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import {usePropsFromParams} from './props_from_params';

const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
    useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@utils/helpers', () => ({
    safeParseJSON: jest.fn((value) => {
        // Mock safeParseJSON behavior
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    }),
}));

describe('usePropsFromParams', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should convert string params to props', () => {
        mockUseLocalSearchParams.mockReturnValue({
            userId: 'user123',
            channelId: 'channel456',
        });

        const {result} = renderHook(() => usePropsFromParams<{userId: string; channelId: string}>());

        expect(result.current).toEqual({
            userId: 'user123',
            channelId: 'channel456',
        });
    });

    it('should parse JSON string params', () => {
        mockUseLocalSearchParams.mockReturnValue({
            user: '{"id":"123","name":"John"}',
            count: '42',
        });

        const {result} = renderHook(() => usePropsFromParams<{user: {id: string; name: string}; count: number}>());

        expect(result.current).toEqual({
            user: {id: '123', name: 'John'},
            count: 42,
        });
    });

    it('should handle boolean params', () => {
        mockUseLocalSearchParams.mockReturnValue({
            isActive: 'true',
            isVisible: 'false',
        });

        const {result} = renderHook(() => usePropsFromParams<{isActive: boolean; isVisible: boolean}>());

        expect(result.current).toEqual({
            isActive: true,
            isVisible: false,
        });
    });

    it('should handle array params', () => {
        mockUseLocalSearchParams.mockReturnValue({
            items: '["item1","item2","item3"]',
        });

        const {result} = renderHook(() => usePropsFromParams<{items: string[]}>());

        expect(result.current).toEqual({
            items: ['item1', 'item2', 'item3'],
        });
    });

    it('should handle empty params', () => {
        mockUseLocalSearchParams.mockReturnValue({});

        const {result} = renderHook(() => usePropsFromParams<Record<string, never>>());

        expect(result.current).toEqual({});
    });

    it('should handle mixed types of params', () => {
        mockUseLocalSearchParams.mockReturnValue({
            name: 'Test',
            count: '5',
            active: 'true',
            data: '{"key":"value"}',
        });

        const {result} = renderHook(() => usePropsFromParams<{
            name: string;
            count: number;
            active: boolean;
            data: {key: string};
        }>());

        expect(result.current).toEqual({
            name: 'Test',
            count: 5,
            active: true,
            data: {key: 'value'},
        });
    });

    it('should handle params that are already objects', () => {
        mockUseLocalSearchParams.mockReturnValue({
            user: {id: '123', name: 'John'},
            settings: {theme: 'dark'},
        });

        const {result} = renderHook(() => usePropsFromParams<{
            user: {id: string; name: string};
            settings: {theme: string};
        }>());

        expect(result.current).toEqual({
            user: {id: '123', name: 'John'},
            settings: {theme: 'dark'},
        });
    });

    it('should handle null values', () => {
        mockUseLocalSearchParams.mockReturnValue({
            nullValue: 'null',
            emptyString: '',
        });

        const {result} = renderHook(() => usePropsFromParams<{nullValue: null; emptyString: string}>());

        expect(result.current).toEqual({
            nullValue: null,
            emptyString: '',
        });
    });

    it('should handle malformed JSON strings gracefully', () => {
        mockUseLocalSearchParams.mockReturnValue({
            invalidJson: '{invalid json}',
        });

        const {result} = renderHook(() => usePropsFromParams<{invalidJson: string}>());

        // Should keep the original string if JSON parsing fails
        expect(result.current).toEqual({
            invalidJson: '{invalid json}',
        });
    });

    it('should handle numeric strings', () => {
        mockUseLocalSearchParams.mockReturnValue({
            age: '25',
            price: '99.99',
        });

        const {result} = renderHook(() => usePropsFromParams<{age: number; price: number}>());

        expect(result.current).toEqual({
            age: 25,
            price: 99.99,
        });
    });

    it('should handle complex nested objects', () => {
        mockUseLocalSearchParams.mockReturnValue({
            config: '{"user":{"id":"123","profile":{"name":"John","age":30}},"settings":{"theme":"dark"}}',
        });

        const {result} = renderHook(() => usePropsFromParams<{
            config: {
                user: {
                    id: string;
                    profile: {name: string; age: number};
                };
                settings: {theme: string};
            };
        }>());

        expect(result.current).toEqual({
            config: {
                user: {
                    id: '123',
                    profile: {name: 'John', age: 30},
                },
                settings: {theme: 'dark'},
            },
        });
    });

    it('should handle params with special characters', () => {
        mockUseLocalSearchParams.mockReturnValue({
            message: 'Hello World!',
            url: 'https://example.com',
        });

        const {result} = renderHook(() => usePropsFromParams<{message: string; url: string}>());

        expect(result.current).toEqual({
            message: 'Hello World!',
            url: 'https://example.com',
        });
    });

    it('should update props when params change', () => {
        mockUseLocalSearchParams.mockReturnValue({
            userId: 'user1',
        });

        const {result, rerender} = renderHook(() => usePropsFromParams<{userId: string}>());

        expect(result.current).toEqual({
            userId: 'user1',
        });

        // Update params
        mockUseLocalSearchParams.mockReturnValue({
            userId: 'user2',
        });

        rerender();

        expect(result.current).toEqual({
            userId: 'user2',
        });
    });

    it('should handle array of objects as JSON string', () => {
        mockUseLocalSearchParams.mockReturnValue({
            users: '[{"id":"1","name":"John"},{"id":"2","name":"Jane"}]',
        });

        const {result} = renderHook(() => usePropsFromParams<{
            users: Array<{id: string; name: string}>;
        }>());

        expect(result.current).toEqual({
            users: [
                {id: '1', name: 'John'},
                {id: '2', name: 'Jane'},
            ],
        });
    });

    it('should return empty object with correct type', () => {
        mockUseLocalSearchParams.mockReturnValue({});

        const {result} = renderHook(() => usePropsFromParams<{optional?: string}>());

        expect(result.current).toEqual({});
        expect(typeof result.current).toBe('object');
    });
});
