// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import BaseChip from '@components/chips/base_chip';
import ProfilePicture from '@components/profile_picture';
import {fireEvent, renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import TaskActivityIndicator from './task_activity_indicator';

jest.mock('@components/chips/base_chip');
jest.mocked(BaseChip).mockImplementation((props) => React.createElement('BaseChip', props, props.prefix));

jest.mock('@components/profile_picture');
jest.mocked(ProfilePicture).mockImplementation((props) => React.createElement('ProfilePicture', props));

const TEST_ID = 'playbook_run.checklist_item.task_activity';

describe('TaskActivityIndicator', () => {
    const timestamp = new Date(2026, 6, 21, 10, 30).getTime();
    const actor = TestHelper.fakeUserModel({id: 'user-1', username: 'alex'});

    const render = (props: Partial<ComponentProps<typeof TaskActivityIndicator>>) => renderWithIntl(
        <TaskActivityIndicator
            activity={{action: 'check', timestamp}}
            teammateNameDisplay='username'
            timezone=''
            isMilitaryTime={false}
            variant='chip'
            {...props}
        />,
    );

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(new Date(2026, 6, 21, 12, 30));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should show the relative time on the chip and open the actor profile on press', () => {
        const onActorPress = jest.fn();
        const {getByTestId} = render({activity: {action: 'check', actorUserId: actor.id, timestamp}, actor, onActorPress});

        const activity = getByTestId(TEST_ID);
        expect(getByTestId(`${TEST_ID}.chip`).props.label).toBe('2h ago');
        expect(activity.props.accessibilityLabel).toContain('Checked by alex');
        expect(activity.props.accessibilityRole).toBe('button');

        fireEvent.press(activity);
        expect(onActorPress).toHaveBeenCalledWith(actor.id);
    });

    it('should not be a button when there is no actor', () => {
        const {getByTestId, queryByTestId} = render({activity: {action: 'uncheck', timestamp}});

        expect(queryByTestId(`${TEST_ID}.avatar`)).toBeNull();
        expect(getByTestId(TEST_ID).props.accessibilityLabel).toContain('Unchecked');
        expect(getByTestId(TEST_ID).props.accessibilityRole).toBeUndefined();
    });

    it('should show the action, actor and absolute time in the detail row', () => {
        const {getByText} = render({activity: {action: 'skip', actorUserId: actor.id, timestamp}, actor, variant: 'detail'});

        expect(getByText('Skipped 2 hours ago')).toBeVisible();
        expect(getByText('alex')).toBeVisible();
        expect(getByText(/Jul 21, 2026 at/)).toBeVisible();
    });

    it.each([
        ['Asia/Kolkata', false, 'Jul 21, 2026 at 6:54 PM'],
        ['UTC', true, 'Jul 21, 2026 at 13:24'],
    ])('should format the absolute time in %p with military time %p', (timezone, isMilitaryTime, expected) => {
        const {getByText} = render({activity: {action: 'check', timestamp: Date.UTC(2026, 6, 21, 13, 24)}, timezone, isMilitaryTime, variant: 'detail'});

        expect(getByText(expected)).toBeVisible();
    });
});
