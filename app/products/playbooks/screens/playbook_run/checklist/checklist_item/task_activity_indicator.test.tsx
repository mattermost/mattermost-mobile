// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import BaseChip from '@components/chips/base_chip';
import ProfilePicture from '@components/profile_picture';
import {renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import TaskActivityIndicator from './task_activity_indicator';

jest.mock('@components/chips/base_chip');
jest.mocked(BaseChip).mockImplementation((props) => React.createElement('BaseChip', props, props.prefix));

jest.mock('@components/profile_picture');
jest.mocked(ProfilePicture).mockImplementation((props) => React.createElement('ProfilePicture', props));

const CHECK_GLYPH = String.fromCodePoint(0xf012c);

describe('TaskActivityIndicator', () => {
    const timestamp = new Date(2026, 6, 21, 10, 30).getTime();
    const actor = TestHelper.fakeUserModel({id: 'user-1', username: 'alex'});

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(2026, 6, 21, 12, 30));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders a compact checked row chip with a bare check icon and the actor avatar', () => {
        const onActorPress = jest.fn();
        const {getByTestId} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action: 'check', actorUserId: actor.id, timestamp}}
                actor={actor}
                teammateNameDisplay='username'
                timezone=''
                isMilitaryTime={false}
                variant='chip'
                onActorPress={onActorPress}
            />,
        );

        const activity = getByTestId('playbook_run.checklist_item.task_activity');
        const chip = getByTestId('playbook_run.checklist_item.task_activity.chip');
        const icon = getByTestId('playbook_run.checklist_item.task_activity.icon');

        // The accessibility label keeps the full verb, actor, and absolute time even though the
        // visible chip only shows the compact relative time.
        expect(activity.props.accessibilityLabel).toContain('Checked by alex');
        expect(activity.props.accessibilityLabel).toContain('Jul 21, 2026');
        expect(chip.props.label).toBe('2h ago');
        expect(chip.props.label).not.toContain('Checked');
        expect(icon.props.children).toContain(CHECK_GLYPH);
        expect(getByTestId('playbook_run.checklist_item.task_activity.avatar')).toBeVisible();

        chip.props.onPress();
        expect(onActorPress).toHaveBeenCalledWith(actor.id);
    });

    it('renders an unchecked time-only chip without guessing an actor', () => {
        const {getByTestId, queryByTestId} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action: 'uncheck', timestamp}}
                teammateNameDisplay='username'
                timezone=''
                isMilitaryTime={false}
                variant='chip'
            />,
        );

        const chip = getByTestId('playbook_run.checklist_item.task_activity.chip');
        expect(chip.props.label).toBe('2h ago');
        expect(chip.props.label).not.toContain('Unchecked');
        expect(chip.props.onPress).toBeUndefined();
        expect(queryByTestId('playbook_run.checklist_item.task_activity.avatar')).toBeNull();
    });

    it('shows who, relative time, and absolute time in the detail row', () => {
        const {getByTestId, getByText} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action: 'check', actorUserId: actor.id, timestamp}}
                actor={actor}
                teammateNameDisplay='username'
                timezone=''
                isMilitaryTime={false}
                variant='detail'
            />,
        );

        expect(getByTestId('playbook_run.checklist_item.task_activity.detail')).toBeVisible();
        expect(getByText('Checked 2 hours ago')).toBeVisible();
        expect(getByText('alex')).toBeVisible();
        expect(getByText(/Jul 21, 2026 at/)).toBeVisible();
    });

    it('renders the absolute time in the provided timezone, not UTC', () => {
        // 07:27 UTC is 12:57 in Asia/Kolkata (UTC+5:30). A missing/UTC timezone would render 7:27 AM.
        const utcTimestamp = Date.UTC(2026, 6, 21, 7, 27);
        const {getByText} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action: 'check', actorUserId: actor.id, timestamp: utcTimestamp}}
                actor={actor}
                teammateNameDisplay='username'
                timezone='Asia/Kolkata'
                isMilitaryTime={false}
                variant='detail'
            />,
        );

        expect(getByText('Jul 21, 2026 at 12:57 PM')).toBeVisible();
    });

    it('renders a 24-hour absolute time when the user prefers military time', () => {
        const utcTimestamp = Date.UTC(2026, 6, 21, 13, 24);
        const {getByText} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action: 'check', actorUserId: actor.id, timestamp: utcTimestamp}}
                actor={actor}
                teammateNameDisplay='username'
                timezone='UTC'
                isMilitaryTime={true}
                variant='detail'
            />,
        );

        expect(getByText('Jul 21, 2026 at 13:24')).toBeVisible();
    });

    it('renders a 12-hour absolute time when the user does not prefer military time', () => {
        const utcTimestamp = Date.UTC(2026, 6, 21, 13, 24);
        const {getByText} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action: 'check', actorUserId: actor.id, timestamp: utcTimestamp}}
                actor={actor}
                teammateNameDisplay='username'
                timezone='UTC'
                isMilitaryTime={false}
                variant='detail'
            />,
        );

        expect(getByText('Jul 21, 2026 at 1:24 PM')).toBeVisible();
    });
});
