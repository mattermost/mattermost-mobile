// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import * as CustomProfileActions from '@actions/remote/custom_profile';
import * as CustomProfileQueries from '@queries/servers/custom_profile';
import {renderWithIntlAndTheme, waitFor} from '@test/intl-test-helper';

import UserInfo from './user_info';

import type UserModel from '@database/models/server/user';
import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';

const localhost = 'http://localhost:8065';

// Create test attribute sets
const serverAttributes: CustomAttributeSet = {
    attr1: {
        id: 'attr1',
        name: 'Department',
        value: 'Engineering',
        type: 'text',
        sort_order: 1,
    },
    attr2: {
        id: 'attr2',
        name: 'Location',
        value: 'Remote',
        type: 'text',
        sort_order: 0,
    },
};

const updatedAttributes: CustomAttributeSet = {
    attr1: {
        id: 'attr1',
        name: 'Department',
        value: 'Engineering Updated',
        type: 'text',
        sort_order: 1,
    },
    attr2: {
        id: 'attr2',
        name: 'Location',
        value: 'Office',
        type: 'text',
        sort_order: 0,
    },
    attr3: {
        id: 'attr3',
        name: 'Team',
        value: 'Mobile',
        type: 'text',
        sort_order: 2,
    },
};

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

    test('should load attributes from database before fetching from server', async () => {
        // Mock fetch to return server attributes
        const fetchMock = CustomProfileActions.fetchCustomProfileAttributes as jest.Mock;
        fetchMock.mockResolvedValue({
            attributes: serverAttributes,
            error: undefined,
        });

        // Render with initial customAttributesSet
        const {queryByText, rerender} = renderWithIntlAndTheme(
            <UserInfo
                {...baseProps}
                customAttributesSet={{}}
            />,
        );

        // Initially there should be no custom attributes displayed
        expect(queryByText('Engineering')).toBeNull();
        expect(queryByText('Remote')).toBeNull();

        // Verify fetch was called
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(localhost, 'user1', true);
        });

        // Simulate receiving custom attributes from props
        rerender(
            <UserInfo
                {...baseProps}
                customAttributesSet={serverAttributes}
            />,
        );

        // Custom attributes should now be displayed
        await waitFor(() => {
            expect(queryByText('Engineering')).not.toBeNull();
            expect(queryByText('Remote')).not.toBeNull();
        });
    });

    test('should update UI when database changes via observables', async () => {
        // Set up component with initial empty attributes
        const {queryByText, rerender} = renderWithIntlAndTheme(
            <UserInfo
                {...baseProps}
                customAttributesSet={{}}
            />,
        );

        // Initially there should be no custom attributes
        expect(queryByText('Engineering')).toBeNull();

        // Simulate receiving attributes from props (as would happen from parent observable)
        rerender(
            <UserInfo
                {...baseProps}
                customAttributesSet={serverAttributes}
            />,
        );

        // Now the attributes should be displayed
        await waitFor(() => {
            expect(queryByText('Engineering')).not.toBeNull();
            expect(queryByText('Remote')).not.toBeNull();
        });

        // Simulate a database update via changed props
        rerender(
            <UserInfo
                {...baseProps}
                customAttributesSet={updatedAttributes}
            />,
        );

        // Updated values should be displayed
        await waitFor(() => {
            expect(queryByText('Engineering Updated')).not.toBeNull();
            expect(queryByText('Office')).not.toBeNull();
            expect(queryByText('Mobile')).not.toBeNull();
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
