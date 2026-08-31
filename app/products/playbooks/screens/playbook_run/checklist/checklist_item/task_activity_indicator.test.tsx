// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import BaseChip from '@components/chips/base_chip';
import ProfilePicture from '@components/profile_picture';
import {fireEvent, renderWithIntl} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import TaskActivityIndicator from './task_activity_indicator';

import type {TaskActivityAction} from './task_activity';

jest.mock('@components/chips/base_chip');
jest.mocked(BaseChip).mockImplementation((props) => React.createElement('BaseChip', props, props.prefix));

jest.mock('@components/profile_picture');
jest.mocked(ProfilePicture).mockImplementation((props) => React.createElement('ProfilePicture', props));

// Compass glyph codepoints, so the icon assertions catch a wrong icon rather than just a present one.
const GLYPHS: Record<TaskActivityAction, string> = {
    check: String.fromCodePoint(0xf012c),
    uncheck: String.fromCodePoint(0xf0131),
    skip: String.fromCodePoint(0xf0156),
    restore: String.fromCodePoint(0xf0450),
};

const CHECK_GLYPH = GLYPHS.check;

describe('TaskActivityIndicator', () => {
    const timestamp = new Date(2026, 6, 21, 10, 30).getTime();
    const actor = TestHelper.fakeUserModel({id: 'user-1', username: 'alex'});

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.setSystemTime(new Date(2026, 6, 21, 12, 30));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should render a compact checked row chip with a bare check icon and the actor avatar', () => {
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
        // visible chip only shows the compact relative time. It sits on the pressable itself so that
        // a screen reader announces and can activate the same element.
        expect(activity.props.accessibilityLabel).toContain('Checked by alex');
        expect(activity.props.accessibilityLabel).toContain('Jul 21, 2026');
        expect(activity.props.accessibilityRole).toBe('button');
        expect(chip.props.label).toBe('2h ago');
        expect(chip.props.label).not.toContain('Checked');
        expect(icon.props.children).toContain(CHECK_GLYPH);
        expect(getByTestId('playbook_run.checklist_item.task_activity.avatar')).toBeVisible();

        fireEvent.press(activity);
        expect(onActorPress).toHaveBeenCalledWith(actor.id);
    });

    it('should render an unchecked time-only chip without guessing an actor', () => {
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
        expect(queryByTestId('playbook_run.checklist_item.task_activity.avatar')).toBeNull();

        // With nobody to open a profile for, the chip is only an announced group and not a button.
        const activity = getByTestId('playbook_run.checklist_item.task_activity');
        expect(activity.props.accessible).toBe(true);
        expect(activity.props.accessibilityLabel).toContain('Unchecked');
        expect(activity.props.accessibilityRole).toBeUndefined();
    });

    const actionCases: Array<[TaskActivityAction, string]> = [
        ['check', 'Checked'],
        ['uncheck', 'Unchecked'],
        ['skip', 'Skipped'],
        ['restore', 'Restored'],
    ];

    it.each(actionCases)('should render the %p action with its own icon and verb in the row chip', (action, verb) => {
        const {getByTestId} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action, timestamp}}
                teammateNameDisplay='username'
                timezone=''
                isMilitaryTime={false}
                variant='chip'
            />,
        );

        expect(getByTestId('playbook_run.checklist_item.task_activity.icon').props.children).toContain(GLYPHS[action]);

        // The row chip shows only the compact time, so the verb lives in the accessibility label.
        expect(getByTestId('playbook_run.checklist_item.task_activity').props.accessibilityLabel).toContain(verb);
        expect(getByTestId('playbook_run.checklist_item.task_activity.chip').props.label).toBe('2h ago');
    });

    it.each(actionCases)('should render the %p action with its own icon and verb in the detail row', (action, verb) => {
        const {getByTestId, getByText} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action, timestamp}}
                teammateNameDisplay='username'
                timezone=''
                isMilitaryTime={false}
                variant='detail'
            />,
        );

        // The icon repeats the verb the row already spells out, so it is hidden from accessibility.
        expect(getByTestId('playbook_run.checklist_item.task_activity.detail_icon', {includeHiddenElements: true}).props.children).toContain(GLYPHS[action]);
        expect(getByText(`${verb} 2 hours ago`)).toBeVisible();
    });

    it('should show who, relative time, and absolute time in the detail row', () => {
        const onActorPress = jest.fn();
        const {getByLabelText, getByTestId, getByText, queryByTestId} = renderWithIntl(
            <TaskActivityIndicator
                activity={{action: 'check', actorUserId: actor.id, timestamp}}
                actor={actor}
                teammateNameDisplay='username'
                timezone=''
                isMilitaryTime={false}
                variant='detail'
                onActorPress={onActorPress}
            />,
        );

        expect(getByTestId('playbook_run.checklist_item.task_activity.detail')).toBeVisible();
        expect(getByText('Checked 2 hours ago')).toBeVisible();
        expect(getByText('alex')).toBeVisible();
        expect(getByText(/Jul 21, 2026 at/)).toBeVisible();

        // The three lines are announced as one label, while the actor avatar stays a reachable
        // button of its own rather than being collapsed into that label.
        expect(getByLabelText(/^Checked by alex, 2 hours ago, Jul 21, 2026 at/)).toBeVisible();
        expect(queryByTestId('playbook_run.checklist_item.task_activity.detail_icon')).toBeNull();

        const actorButton = getByTestId('playbook_run.checklist_item.task_activity.actor_button');
        expect(actorButton.props.accessibilityRole).toBe('button');
        expect(actorButton.props.accessibilityLabel).toBe('View profile of alex');

        fireEvent.press(actorButton);
        expect(onActorPress).toHaveBeenCalledWith(actor.id);
    });

    it('should render the absolute time in the provided timezone, not UTC', () => {
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

    it('should render a 24-hour absolute time when the user prefers military time', () => {
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

    it('should render a 12-hour absolute time when the user does not prefer military time', () => {
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
