// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import BaseChip from '@components/chips/base_chip';
import UserChip from '@components/chips/user_chip';
import UserAvatarsStack from '@components/user_avatars_stack';
import {Preferences} from '@constants';
import {useTheme} from '@context/theme';
import {goToPlaybookRun} from '@playbooks/screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookCard from './playbook_card';
import ProgressBar from './progress_bar';

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(),
}));
jest.mocked(useTheme).mockReturnValue(Preferences.THEMES.denim);

jest.mock('@components/compass_icon', () => 'CompassIcon');

jest.mock('@playbooks/screens/navigation', () => ({
    goToPlaybookRun: jest.fn(),
}));

jest.mock('@components/user_avatars_stack', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(UserAvatarsStack).mockImplementation((props) => React.createElement('UserAvatarsStack', {...props, testID: 'user-avatars-stack'}));

jest.mock('@components/chips/user_chip', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(UserChip).mockImplementation((props) => React.createElement('UserChip', {...props, testID: 'user-chip'}));

jest.mock('@components/chips/base_chip', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(BaseChip).mockImplementation((props) => React.createElement('BaseChip', {...props, testID: 'base-chip'}));

jest.mock('./progress_bar', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ProgressBar).mockImplementation((props) => React.createElement('ProgressBar', {...props, testID: 'progress-bar'}));

describe('PlaybookCard', () => {
    const mockRun = TestHelper.fakePlaybookRunModel({
        name: 'Test Playbook Run',
        lastStatusUpdateAt: 1234567890,
    });
    const mockOwner = TestHelper.fakeUserModel({
        username: 'test-owner',
    });
    const mockParticipants = [
        TestHelper.fakeUserModel({username: 'participant1'}),
        TestHelper.fakeUserModel({username: 'participant2'}),
    ];

    const baseProps = {
        run: mockRun,
        location: 'PlaybookRuns' as const,
        participants: mockParticipants,
        progress: 50,
        owner: mockOwner,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all components correctly', () => {
        const {getByTestId, getByText} = renderWithIntl(
            <PlaybookCard {...baseProps}/>,
        );

        // Verify main components are rendered
        expect(getByText('Test Playbook Run')).toBeTruthy();

        const userChip = getByTestId('user-chip');
        expect(userChip.props.user).toBe(mockOwner);
        expect(userChip.props.teammateNameDisplay).toBe('username');

        const userAvatarsStack = getByTestId('user-avatars-stack');
        expect(userAvatarsStack.props.users).toEqual(mockParticipants);
        expect(userAvatarsStack.props.channelId).toBe(mockRun.channelId);
        expect(userAvatarsStack.props.location).toBe(baseProps.location);

        const baseChip = getByTestId('base-chip');
        expect(baseChip.props.prefix).toBeDefined();
        expect(baseChip.props.label).toBe('Playbook with really long name');

        const progressBar = getByTestId('progress-bar');
        expect(progressBar.props.progress).toBe(50);
        expect(progressBar.props.isActive).toBe(true);
    });

    it('navigates to playbook run on press', () => {
        const {getByText} = renderWithIntl(
            <PlaybookCard {...baseProps}/>,
        );

        act(() => {
            fireEvent.press(getByText('Test Playbook Run'));
        });

        expect(goToPlaybookRun).toHaveBeenCalledWith(
            expect.anything(),
            mockRun.id,
        );
    });

    it('shows finished state when run is complete', () => {
        const completedRun = TestHelper.fakePlaybookRunModel({
            endAt: 1234567890,
        });

        const {getByTestId} = renderWithIntl(
            <PlaybookCard
                {...baseProps}
                run={completedRun}
            />,
        );

        const progressBar = getByTestId('progress-bar');
        expect(progressBar.props.isActive).toBe(false);
    });

    it('shows active state when run is ongoing', () => {
        const activeRun = TestHelper.fakePlaybookRunModel({
            endAt: 0,
        });

        const {getByTestId} = renderWithIntl(
            <PlaybookCard
                {...baseProps}
                run={activeRun}
            />,
        );

        const progressBar = getByTestId('progress-bar');
        expect(progressBar.props.isActive).toBe(true);
    });

    it('renders without owner', () => {
        const {queryByTestId} = renderWithIntl(
            <PlaybookCard
                {...baseProps}
                owner={undefined}
            />,
        );

        expect(queryByTestId('user-chip')).toBeNull();
    });

    it('passes correct props to BaseChip', () => {
        const {getByTestId} = renderWithIntl(<PlaybookCard {...baseProps}/>);

        const baseChip = getByTestId('base-chip');
        expect(baseChip.props.prefix).toBeDefined();
        expect(baseChip.props.label).toBe('Playbook with really long name');
    });
});
