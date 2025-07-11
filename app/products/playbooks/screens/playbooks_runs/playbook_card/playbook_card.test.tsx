// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import UserChip from '@components/chips/user_chip';
import UserAvatarsStack from '@components/user_avatars_stack';
import ProgressBar from '@playbooks/components/progress_bar';
import {goToPlaybookRun} from '@playbooks/screens/navigation';
import {openUserProfileModal} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookCard from './playbook_card';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

jest.mock('@playbooks/screens/navigation');

jest.mock('@components/user_avatars_stack');
jest.mocked(UserAvatarsStack).mockImplementation((props) => React.createElement('UserAvatarsStack', {...props, testID: 'user-avatars-stack'}));

jest.mock('@components/chips/user_chip');
jest.mocked(UserChip).mockImplementation((props) => React.createElement('UserChip', {...props, testID: 'user-chip'}));

jest.mock('@playbooks/components/progress_bar');
jest.mocked(ProgressBar).mockImplementation((props) => React.createElement('ProgressBar', {...props, testID: 'progress-bar'}));

describe('PlaybookCard', () => {
    function getBaseProps(): ComponentProps<typeof PlaybookCard> {
        const mockRun = TestHelper.fakePlaybookRunModel({
            name: 'Test Playbook Run',
            updateAt: Date.now() - 1000,
            channelId: 'test-channel-id',
        });
        const mockOwner = TestHelper.fakeUserModel({
            username: 'test-owner',
        });
        const mockParticipants = [
            TestHelper.fakeUserModel({username: 'participant1'}),
            TestHelper.fakeUserModel({username: 'participant2'}),
        ];

        return {
            run: mockRun,
            location: 'PlaybookRuns',
            participants: mockParticipants,
            progress: 50,
            owner: mockOwner,
        };
    }

    it('renders all components correctly', () => {
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntl(<PlaybookCard {...props}/>);

        // Verify main components are rendered
        expect(getByText('Test Playbook Run')).toBeTruthy();
        expect(getByText(/Last update/)).toBeTruthy();

        const userChip = getByTestId('user-chip');
        expect(userChip.props.user).toBe(props.owner);
        expect(userChip.props.teammateNameDisplay).toBe('username');

        const userAvatarsStack = getByTestId('user-avatars-stack');
        expect(userAvatarsStack.props.users).toEqual(props.participants);
        expect(userAvatarsStack.props.channelId).toBe((props.run as PlaybookRunModel).channelId);
        expect(userAvatarsStack.props.location).toBe(props.location);
        expect(userAvatarsStack.props.bottomSheetTitle.defaultMessage).toBe('Run Participants');

        const progressBar = getByTestId('progress-bar');
        expect(progressBar.props.progress).toBe(50);
        expect(progressBar.props.isActive).toBe(true);
    });

    it('should open user profile modal on user chip press', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntl(<PlaybookCard {...props}/>);

        const userChip = getByTestId('user-chip');
        userChip.props.onPress(props.owner?.id);

        expect(openUserProfileModal).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.objectContaining({userId: props.owner?.id, channelId: (props.run as PlaybookRunModel).channelId, location: props.location}),
        );
    });

    it('navigates to playbook run on press', () => {
        const props = getBaseProps();
        const {getByText} = renderWithIntl(<PlaybookCard {...props}/>);

        act(() => {
            fireEvent.press(getByText('Test Playbook Run'));
        });

        expect(goToPlaybookRun).toHaveBeenCalledWith(
            expect.anything(),
            props.run.id,
            undefined,
        );
    });

    it('shows finished state when run is complete', () => {
        const props = getBaseProps();
        (props.run as PlaybookRunModel).currentStatus = 'Finished';

        const {getByTestId} = renderWithIntl(<PlaybookCard {...props}/>);

        const progressBar = getByTestId('progress-bar');
        expect(progressBar.props.isActive).toBe(false);
    });

    it('renders without owner', () => {
        const props = getBaseProps();
        props.owner = undefined;

        const {queryByTestId} = renderWithIntl(<PlaybookCard {...props}/>);

        expect(queryByTestId('user-chip')).toBeNull();
    });
});
