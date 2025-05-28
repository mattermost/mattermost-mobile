// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {setGlobalThreadsTab} from '@actions/local/systems';
import NavigationHeader from '@components/navigation_header';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import useTabs from '@hooks/use_tabs';
import {renderWithEverything} from '@test/intl-test-helper';

import GlobalThreads from './global_threads';
import Header from './threads_list/header';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

jest.mock('@hooks/header', () => ({
    useDefaultHeaderHeight: jest.fn().mockReturnValue(50),
}));

jest.mock('@hooks/team_switch', () => ({
    useTeamSwitch: jest.fn().mockReturnValue(false),
}));

jest.mock('@actions/local/systems', () => ({
    setGlobalThreadsTab: jest.fn(),
}));

jest.mock('@components/navigation_header', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(NavigationHeader).mockImplementation((props) => React.createElement('NavigationHeader', props));

jest.mock('./threads_list/header', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Header).mockImplementation((props) => React.createElement('Header', props));

jest.mock('@hooks/use_tabs', () => ({
    __esModule: true,
    default: jest.fn(jest.requireActual('@hooks/use_tabs').default),
}));

describe('GlobalThreads', () => {
    const serverUrl = 'https://example.com';
    let database: Database;

    const baseProps = {
        componentId: Screens.GLOBAL_THREADS,
        globalThreadsTab: 'all' as const,
        hasUnreads: false,
        teamId: 'team-id',
    };

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const result = DatabaseManager.serverDatabases[serverUrl]!;
        database = result.database;
    });

    afterEach(async () => {
        await DatabaseManager.deleteServerDatabase(serverUrl);
    });

    it('renders correctly with default props', () => {
        renderWithEverything(<GlobalThreads {...baseProps}/>, {
            database,
        });

        expect(useTabs).toHaveBeenCalledWith(
            expect.any(String),
            expect.arrayContaining([
                expect.objectContaining({id: 'unreads', name: expect.objectContaining({defaultMessage: 'Unreads'})}),
                expect.objectContaining({id: 'all', name: expect.objectContaining({defaultMessage: 'All your threads'})}),
            ]),
            expect.any(Function),
            expect.any(String),
        );
    });

    it('shows dot indicator when hasUnreads is true', () => {
        const {rerender} = renderWithEverything(
            <GlobalThreads
                {...baseProps}
                hasUnreads={true}
            />,
            {
                database,
            },
        );

        // Verify the unreads tab has a dot indicator
        expect(useTabs).toHaveBeenCalledWith(
            expect.any(String),
            expect.arrayContaining([
                expect.objectContaining({id: 'unreads', requiresUserAttention: true}),
                expect.objectContaining({id: 'all', requiresUserAttention: false}),
            ]),
            expect.any(Function),
            expect.any(String),
        );

        jest.mocked(useTabs).mockClear();

        rerender(
            <GlobalThreads
                {...baseProps}
                hasUnreads={false}
            />,
        );

        expect(useTabs).toHaveBeenCalledWith(
            expect.any(String),
            expect.arrayContaining([
                expect.objectContaining({id: 'unreads', requiresUserAttention: false}),
                expect.objectContaining({id: 'all', requiresUserAttention: false}),
            ]),
            expect.any(Function),
            expect.any(String),
        );
    });

    it('passes teamId to Header component', () => {
        const {getByTestId} = renderWithEverything(<GlobalThreads {...baseProps}/>, {
            database,
        });

        const header = getByTestId('global_threads.threads_list.header');
        expect(header.props.teamId).toBe('team-id');
    });

    it('saves tab selection on unmount', () => {
        const {unmount} = renderWithEverything(<GlobalThreads {...baseProps}/>, {
            database,
        });

        unmount();

        expect(setGlobalThreadsTab).toHaveBeenCalledWith(expect.any(String), 'all');
    });
});
