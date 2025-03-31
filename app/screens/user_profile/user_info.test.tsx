// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Subject} from 'rxjs';

import {fetchCustomProfileAttributes} from '@actions/remote/custom_profile';
import * as CustomProfileQueries from '@queries/servers/custom_profile';
import {act, renderWithIntlAndTheme, screen, waitFor} from '@test/intl-test-helper';

import UserInfo from './user_info';

import type CustomProfileAttributeModel from '@database/models/server/custom_profile_attribute';
import type UserModel from '@database/models/server/user';

const localhost = 'http://localhost:8065';

jest.mock('@actions/remote/user', () => ({
    fetchCustomAttributes: jest.fn().mockResolvedValue({}),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue(localhost),
}));

// Mock database manager
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn().mockReturnValue({
        database: {
            get: jest.fn().mockReturnValue({
                query: jest.fn().mockReturnValue({
                    fetch: jest.fn(),
                    observe: jest.fn(),
                }),
                find: jest.fn(),
            }),
        },
    }),
}));

// Mock custom profile queries
jest.mock('@queries/servers/custom_profile', () => ({
    queryCustomProfileAttributesByUserId: jest.fn(),
    observeCustomProfileAttributesByUserId: jest.fn(),
    convertProfileAttributesToCustomAttributes: jest.fn(),
}));

describe('screens/user_profile/UserInfo', () => {
    let mockObservable: Subject<CustomProfileAttributeModel[]>;

    beforeEach(() => {
        // Reset mocks before each test
        jest.resetAllMocks();

        // Create a new subject for each test
        mockObservable = new Subject<CustomProfileAttributeModel[]>();

        // Setup default mock behavior
        (CustomProfileQueries.queryCustomProfileAttributesByUserId as jest.Mock).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        });

        (CustomProfileQueries.observeCustomProfileAttributesByUserId as jest.Mock).mockReturnValue(mockObservable);

        (CustomProfileQueries.convertProfileAttributesToCustomAttributes as jest.Mock).mockImplementation(
            (_db, attributes, sortFn) => {
                // If attributes exist, format and optionally sort them
                if (attributes?.length) {
                    const formatted = attributes.map((attr: any) => ({
                        id: attr.fieldId,
                        name: attr.fieldName || attr.fieldId,
                        value: attr.value,
                        sort_order: attr.sortOrder || 0,
                    }));
                    return sortFn ? Promise.resolve(formatted.sort(sortFn)) : Promise.resolve(formatted);
                }
                return Promise.resolve([]);
            },
        );
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
        isMyUser: false,
        showCustomStatus: false,
        showLocalTime: true,
        showNickname: true,
        showPosition: true,
        enableCustomAttributes: true,
    };

    const baseCustomAttributes = {
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
        attr3: {
            id: 'attr3',
            name: 'Start Date',
            value: '2023',
            sort_order: 2,
        },
    };

    const databaseAttributes: CustomProfileAttributeModel[] = [
        {
            id: 'db-attr1',
            fieldId: 'attr1',
            userId: 'user1',
            value: 'Engineering DB',
            fieldName: 'Department',
            sortOrder: 1,
        },
        {
            id: 'db-attr2',
            fieldId: 'attr2',
            userId: 'user1',
            value: 'Remote DB',
            fieldName: 'Location',
            sortOrder: 0,
        },
    ] as unknown as CustomProfileAttributeModel[];

    test('should display custom attributes in sort order', async () => {
        (fetchCustomProfileAttributes as jest.Mock).mockResolvedValue({attributes: baseCustomAttributes});

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        // Wait for the fetch to be called
        await waitFor(() => {
            expect(fetchCustomProfileAttributes).toHaveBeenCalledWith(
                localhost,
                'user1',
                true,
            );
        });

        // Wait for all items to be rendered
        await waitFor(() => {
            // Standard attributes
            expect(screen.getByText('Nickname')).toBeTruthy();
            expect(screen.getByText('Position')).toBeTruthy();
            expect(screen.getByText('nick')).toBeTruthy();
            expect(screen.getByText('Developer')).toBeTruthy();

            // Custom attributes (sorted by sort_order)
            expect(screen.getByText('Location')).toBeTruthy(); // sort_order: 0
            expect(screen.getByText('Remote')).toBeTruthy();
            expect(screen.getByText('Department')).toBeTruthy(); // sort_order: 1
            expect(screen.getByText('Engineering')).toBeTruthy();
            expect(screen.getByText('Start Date')).toBeTruthy(); // sort_order: 2
            expect(screen.getByText('2023')).toBeTruthy();
        });

        // Verify the order of elements
        const titles = screen.getAllByTestId(/.*\.title$/);
        expect(titles.map((el) => el.props.children)).toEqual([
            'Nickname',
            'Position',
            'Location', // sort_order: 0
            'Department', // sort_order: 1
            'Start Date', // sort_order: 2
        ]);

        const descriptions = screen.getAllByTestId(/.*\.description$/);
        expect(descriptions.map((el) => el.props.children)).toEqual([
            'nick',
            'Developer',
            'Remote', // sort_order: 0
            'Engineering', // sort_order: 1
            '2023', // sort_order: 2
        ]);
    });

    test('should load attributes from database first, then from server', async () => {
        // Setup database query to return attributes
        (CustomProfileQueries.queryCustomProfileAttributesByUserId as jest.Mock).mockReturnValue({
            fetch: jest.fn().mockResolvedValue(databaseAttributes),
        });

        // Setup API call to return different attributes
        (fetchCustomProfileAttributes as jest.Mock).mockResolvedValue({attributes: baseCustomAttributes});

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        // First it should show data from database
        await waitFor(() => {
            expect(screen.getByText('Location')).toBeTruthy();
            expect(screen.getByText('Remote DB')).toBeTruthy();
            expect(screen.getByText('Department')).toBeTruthy();
            expect(screen.getByText('Engineering DB')).toBeTruthy();
        });

        // Then it should load data from server
        await waitFor(() => {
            expect(screen.getByText('Remote')).toBeTruthy();
            expect(screen.getByText('Engineering')).toBeTruthy();
            expect(screen.getByText('Start Date')).toBeTruthy();
            expect(screen.getByText('2023')).toBeTruthy();
        });

        // Verify query and API call were made
        expect(CustomProfileQueries.queryCustomProfileAttributesByUserId).toHaveBeenCalled();
        expect(fetchCustomProfileAttributes).toHaveBeenCalledWith(
            localhost,
            'user1',
            true,
        );
    });

    test('should update when database changes', async () => {
        // Setup empty initial database query
        (CustomProfileQueries.queryCustomProfileAttributesByUserId as jest.Mock).mockReturnValue({
            fetch: jest.fn().mockResolvedValue([]),
        });

        // Setup empty API response
        (fetchCustomProfileAttributes as jest.Mock).mockResolvedValue({attributes: {}});

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        // Initially no custom attributes
        await waitFor(() => {
            expect(screen.queryByText('Location')).toBeFalsy();
            expect(screen.queryByText('Department')).toBeFalsy();
        });

        // Emit database change with new attributes
        await act(async () => {
            mockObservable.next(databaseAttributes);
        });

        // Should show database updates
        await waitFor(() => {
            expect(screen.getByText('Location')).toBeTruthy();
            expect(screen.getByText('Remote DB')).toBeTruthy();
            expect(screen.getByText('Department')).toBeTruthy();
            expect(screen.getByText('Engineering DB')).toBeTruthy();
        });
    });

    it('should display custom attributes in order when some have no order', async () => {
        const withEmptyCustomAttributes = {
            attr1: {
                id: 'attr1',
                name: 'Department',
                value: 'Engineering',
            },
            attr2: {
                id: 'attr2',
                name: 'Location',
                value: 'Remote',
                sort_order: 0,
            },
            attr3: {
                id: 'attr3',
                name: 'Start Date',
                value: '2023',
                sort_order: 2,
            },
        };
        (fetchCustomProfileAttributes as jest.Mock).mockResolvedValue({attributes: withEmptyCustomAttributes});

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        await waitFor(() => {
            expect(fetchCustomProfileAttributes).toHaveBeenCalledWith(
                localhost,
                'user1',
                true,
            );
        });

        await waitFor(() => {
            // Standard attributes remain
            expect(screen.getByText('Nickname')).toBeTruthy();
            expect(screen.getByText('Position')).toBeTruthy();
            expect(screen.getByText('nick')).toBeTruthy();
            expect(screen.getByText('Developer')).toBeTruthy();

            // Custom attributes (sorted by sort_order)
            expect(screen.getByText('Location')).toBeTruthy(); // sort_order: 0
            expect(screen.getByText('Remote')).toBeTruthy();
            expect(screen.getByText('Start Date')).toBeTruthy(); // sort_order: 2
            expect(screen.getByText('2023')).toBeTruthy();
            expect(screen.queryByText('Department')).toBeTruthy(); // sort_order: undefined
            expect(screen.queryByText('Engineering')).toBeTruthy();
        });

        // Verify the order of elements
        const titles = screen.getAllByTestId(/.*\.title$/);
        expect(titles.map((el) => el.props.children)).toEqual([
            'Nickname',
            'Position',
            'Location', // sort_order: 0
            'Start Date', // sort_order: 2
            'Department', // sort_order: undefined
        ]);

        const descriptions = screen.getAllByTestId(/.*\.description$/);
        expect(descriptions.map((el) => el.props.children)).toEqual([
            'nick',
            'Developer',
            'Remote', // sort_order: 0
            '2023', // sort_order: 2
            'Engineering', // sort_order: undefined
        ]);
    });

    test('should not fetch data if custom attributes are disabled', async () => {
        renderWithIntlAndTheme(
            <UserInfo
                {...baseProps}
                enableCustomAttributes={false}
            />,
        );

        // Wait a bit to make sure no calls are made
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify no database or API calls were made
        expect(CustomProfileQueries.queryCustomProfileAttributesByUserId).not.toHaveBeenCalled();
        expect(CustomProfileQueries.observeCustomProfileAttributesByUserId).not.toHaveBeenCalled();
        expect(fetchCustomProfileAttributes).not.toHaveBeenCalled();
    });
});
