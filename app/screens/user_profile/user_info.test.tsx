// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fetchCustomAttributes} from '@actions/remote/user';
import {renderWithIntlAndTheme, screen, waitFor} from '@test/intl-test-helper';

import UserInfo from './user_info';

import type UserModel from '@database/models/server/user';

const localhost = 'http://localhost:8065';

jest.mock('@actions/remote/user', () => ({
    fetchCustomAttributes: jest.fn().mockResolvedValue({}),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue(localhost),
}));

describe('screens/user_profile/UserInfo', () => {
    beforeEach(() => {
        // Reset mock before each test
        (fetchCustomAttributes as jest.Mock).mockReset();
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

    test('should display custom attributes in sort order', async () => {
        (fetchCustomAttributes as jest.Mock).mockResolvedValue({attributes: baseCustomAttributes});

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        // Wait for the fetch to be called
        await waitFor(() => {
            expect(fetchCustomAttributes).toHaveBeenCalledWith(
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
        (fetchCustomAttributes as jest.Mock).mockResolvedValue({attributes: withEmptyCustomAttributes});

        renderWithIntlAndTheme(
            <UserInfo {...baseProps}/>,
        );

        await waitFor(() => {
            expect(fetchCustomAttributes).toHaveBeenCalledWith(
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
});
