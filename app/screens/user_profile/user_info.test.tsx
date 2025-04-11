// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import * as CustomProfileActions from '@actions/remote/custom_profile';
import * as CustomProfileQueries from '@queries/servers/custom_profile';
import {renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';

import UserInfo from './user_info';

import type CustomProfileAttributeModel from '@database/models/server/custom_profile_attribute';
import type UserModel from '@database/models/server/user';
import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';

const localhost = 'http://localhost:8065';

jest.mock('@actions/remote/custom_profile', () => ({
    fetchCustomProfileAttributes: jest.fn().mockResolvedValue({
        attributes: {},
        error: undefined,
    }),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue(localhost),
}));

jest.mock('@database/manager', () => {
    const mockDatabase = {
        get: jest.fn().mockReturnValue({
            query: jest.fn().mockReturnValue({
                fetch: jest.fn().mockResolvedValue([]),
            }),
        }),
    };

    return {
        getServerDatabaseAndOperator: jest.fn().mockReturnValue({
            database: mockDatabase,
            operator: {},
        }),
    };
});

const mockQueryFetch = jest.fn().mockResolvedValue([]);
const mockQueryAttributesByUserId = jest.fn().mockReturnValue({
    fetch: mockQueryFetch,
});

const mockAttributesCallback = jest.fn();
const mockFieldsCallback = jest.fn();

const mockAttributesObservable = {
    subscribe: jest.fn().mockImplementation((callback) => {
        mockAttributesCallback.mockImplementation(callback);
        return {unsubscribe: jest.fn()};
    }),
};

const mockFieldsObservable = {
    subscribe: jest.fn().mockImplementation((callback) => {
        mockFieldsCallback.mockImplementation(callback);
        return {unsubscribe: jest.fn()};
    }),
};

const mockConvertAttributes = jest.fn().mockResolvedValue([]);

jest.mock('@queries/servers/custom_profile', () => {
    return {
        queryCustomProfileAttributesByUserId: jest.fn().mockImplementation((...args) =>
            mockQueryAttributesByUserId(...args),
        ),
        observeCustomProfileAttributesByUserId: jest.fn().mockReturnValue(mockAttributesObservable),
        observeCustomProfileFields: jest.fn().mockReturnValue(mockFieldsObservable),
        convertProfileAttributesToCustomAttributes: jest.fn().mockImplementation((...args) =>
            mockConvertAttributes(...args),
        ),
    };
});

describe('screens/user_profile/UserInfo', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (CustomProfileActions.fetchCustomProfileAttributes as jest.Mock).mockResolvedValue({
            attributes: {},
            error: undefined,
        });

        mockQueryFetch.mockResolvedValue([]);
        mockConvertAttributes.mockResolvedValue([]);
    });

    const baseProps = {
        user: {
            id: 'user1',
            firstName: 'First',
            lastName: 'Last',
            username: 'username',
            nickname: 'nick',
            position: 'Developer',
        } as UserModel,
        showCustomStatus: false,
        showLocalTime: true,
        showNickname: true,
        showPosition: true,
        enableCustomAttributes: true,
    };

    const serverAttributes = {
        attr1: {
            id: 'attr1',
            name: 'Department',
            value: 'Engineering',
            sort_order: 1,
        },
        attr2: {
            id: 'attr2',
            name: 'Location',
            value: 'Remote',
            sort_order: 0,
        },
    } as CustomAttributeSet;

    const databaseAttributes = [
        {
            id: 'user1-attr1',
            fieldId: 'attr1',
            userId: 'user1',
            value: 'Engineering DB',
        },
        {
            id: 'user1-attr2',
            fieldId: 'attr2',
            userId: 'user1',
            value: 'Remote DB',
        },
    ] as CustomProfileAttributeModel[];

    const convertedDBAttributes = [
        {
            id: 'attr1',
            name: 'Department',
            value: 'Engineering DB',
            sort_order: 1,
        },
        {
            id: 'attr2',
            name: 'Location',
            value: 'Remote DB',
            sort_order: 0,
        },
    ];

    test('should load attributes from database before fetching from server', async () => {
        mockQueryFetch.mockResolvedValue(databaseAttributes);
        mockConvertAttributes.mockResolvedValue(convertedDBAttributes);

        const fetchMock = CustomProfileActions.fetchCustomProfileAttributes as jest.Mock;
        fetchMock.mockImplementation(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        attributes: serverAttributes,
                        error: undefined,
                    });
                }, 100);
            });
        });

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        await waitFor(() => {
            expect(mockQueryAttributesByUserId).toHaveBeenCalledWith(
                expect.anything(),
                'user1',
            );
            expect(mockConvertAttributes).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(localhost, 'user1', true);
        });
    });

    test('should update UI when database changes via observables', async () => {
        jest.clearAllMocks();

        mockQueryFetch.mockResolvedValue([]);
        (CustomProfileActions.fetchCustomProfileAttributes as jest.Mock).mockResolvedValue({
            attributes: {},
            error: undefined,
        });

        mockConvertAttributes.mockResolvedValueOnce([]);
        mockConvertAttributes.mockResolvedValueOnce(convertedDBAttributes);

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        await waitFor(() => {
            expect(CustomProfileQueries.observeCustomProfileAttributesByUserId).toHaveBeenCalled();
            expect(CustomProfileQueries.observeCustomProfileFields).toHaveBeenCalled();
        });

        const callback = mockAttributesObservable.subscribe.mock.calls?.[0]?.[0];

        if (!callback) {
            return;
        }

        await callback(databaseAttributes);

        await waitFor(() => {
            expect(mockConvertAttributes).toHaveBeenCalledTimes(2);
            expect(mockConvertAttributes).toHaveBeenLastCalledWith(
                expect.anything(),
                databaseAttributes,
                expect.anything(),
            );
        });
    });

    test('should not fetch data if custom attributes are disabled', async () => {
        const fetchMock = CustomProfileActions.fetchCustomProfileAttributes as jest.Mock;

        renderWithIntlAndTheme(
            <UserInfo
                {...baseProps}
                enableCustomAttributes={false}
            />,
        );

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(mockQueryAttributesByUserId).not.toHaveBeenCalled();
        expect(CustomProfileQueries.observeCustomProfileAttributesByUserId).not.toHaveBeenCalled();
        expect(CustomProfileQueries.observeCustomProfileFields).not.toHaveBeenCalled();
    });
});
