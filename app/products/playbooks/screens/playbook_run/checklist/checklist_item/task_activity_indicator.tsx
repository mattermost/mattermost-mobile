// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, type IntlShape, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import {getFriendlyDate} from '@components/friendly_date';
import PressableOpacity from '@components/pressable_opacity';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getFormattedTime} from '@utils/time';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {TaskActivity, TaskActivityAction} from './task_activity';
import type UserModel from '@typings/database/models/servers/user';

const TEST_ID = 'playbook_run.checklist_item.task_activity';

// Mirrors the web chip's icon choices for the same four actions.
const ACTION_ICONS: Record<TaskActivityAction, CompassIconName> = {
    check: 'check',
    uncheck: 'checkbox-blank-outline',
    skip: 'close',
    restore: 'refresh',
};

const ABSOLUTE_DATE_FORMAT: Intl.DateTimeFormatOptions = {year: 'numeric', month: 'short', day: 'numeric'};

const messages = defineMessages({
    absoluteTime: {
        id: 'playbooks.checklist_item.activity.absolute_time',
        defaultMessage: '{date} at {time}',
    },
    summary: {
        id: 'playbooks.checklist_item.activity.summary',
        defaultMessage: '{action} {time}',
    },
    accessibility: {
        id: 'playbooks.checklist_item.activity.accessibility',
        defaultMessage: '{action} {relativeTime}, {absoluteTime}',
    },
    accessibilityActor: {
        id: 'playbooks.checklist_item.activity.accessibility_actor',
        defaultMessage: '{action} by {actor}, {relativeTime}, {absoluteTime}',
    },
    viewProfile: {
        id: 'playbooks.checklist_item.activity.view_profile',
        defaultMessage: 'View profile of {actor}',
    },
});

const actionMessages = defineMessages({
    check: {
        id: 'playbooks.checklist_item.activity.checked',
        defaultMessage: 'Checked',
    },
    uncheck: {
        id: 'playbooks.checklist_item.activity.unchecked',
        defaultMessage: 'Unchecked',
    },
    skip: {
        id: 'playbooks.checklist_item.activity.skipped',
        defaultMessage: 'Skipped',
    },
    restore: {
        id: 'playbooks.checklist_item.activity.restored',
        defaultMessage: 'Restored',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    chipPrefix: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 6,
    },
    chipIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 48,
    },
    detailText: {
        flex: 1,
        gap: 2,
    },
    detailLabel: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    detailInfo: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    detailDate: {
        ...typography('Body', 75, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
}));

const getTaskActivityAbsoluteTime = (intl: IntlShape, timestamp: number, timeZone: string, isMilitaryTime: boolean) => {
    // Without an explicit timeZone, the formatters fall back to the engine default (UTC on React
    // Native), showing the wrong local time/date. Callers pass the user's resolved timezone.
    let date;
    try {
        date = new Intl.DateTimeFormat(intl.locale, {...ABSOLUTE_DATE_FORMAT, timeZone: timeZone || undefined}).format(timestamp);
    } catch (error) {
        // A timezone the engine does not know would otherwise leave us with a raw JS date string.
        logDebug('getTaskActivityAbsoluteTime failed to format the date', getFullErrorMessage(error));
        date = new Intl.DateTimeFormat(intl.locale, ABSOLUTE_DATE_FORMAT).format(timestamp);
    }

    const time = getFormattedTime(isMilitaryTime, timeZone, timestamp);
    return intl.formatMessage(messages.absoluteTime, {date, time});
};

type Props = {
    activity: TaskActivity;
    actor?: UserModel;
    teammateNameDisplay: string;
    timezone: string;
    isMilitaryTime: boolean;
    variant: 'chip' | 'detail';
    onActorPress?: (userId: string) => void;
};

const TaskActivityIndicator = ({activity, actor, teammateNameDisplay, timezone, isMilitaryTime, variant, onActorPress}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const relativeTime = getFriendlyDate(intl, activity.timestamp);
    const compactTime = getFriendlyDate(intl, activity.timestamp, 'narrow');
    const absoluteTime = getTaskActivityAbsoluteTime(intl, activity.timestamp, timezone, isMilitaryTime);
    const actionLabel = intl.formatMessage(actionMessages[activity.action]);
    const actionIcon = ACTION_ICONS[activity.action];
    const actorName = actor ? displayUsername(actor, intl.locale, teammateNameDisplay) : undefined;
    const conciseLabel = intl.formatMessage(messages.summary, {action: actionLabel, time: relativeTime});
    const accessibilityLabel = actorName ? intl.formatMessage(messages.accessibilityActor, {action: actionLabel, actor: actorName, relativeTime, absoluteTime}) : intl.formatMessage(messages.accessibility, {action: actionLabel, relativeTime, absoluteTime});
    const handlePress = useCallback(() => {
        if (actor) {
            onActorPress?.(actor.id);
        }
    }, [actor, onActorPress]);
    const avatar = useMemo(() => (actor ? (
        <ProfilePicture
            author={actor}
            size={20}
            iconSize={20}
            testID={`${TEST_ID}.avatar`}
            showStatus={false}
        />
    ) : undefined), [actor]);

    if (variant === 'chip') {
        // The icon and the avatar only repeat what the label already says, so they are grouped into
        // the single element that carries the label instead of being announced on their own.
        const chip = (
            <BaseChip
                testID={`${TEST_ID}.chip`}
                label={compactTime}
                prefix={
                    <View style={styles.chipPrefix}>
                        <CompassIcon
                            name={actionIcon}
                            size={14}
                            style={styles.chipIcon}
                            testID={`${TEST_ID}.icon`}
                        />
                        {avatar}
                    </View>
                }
            />
        );

        // The press target has to be the element that carries the label, otherwise a screen reader
        // focuses the group and has no way to reach the chip inside it.
        if (actor && onActorPress) {
            return (
                <PressableOpacity
                    onPress={handlePress}
                    accessibilityRole='button'
                    accessibilityLabel={accessibilityLabel}
                    testID={TEST_ID}
                >
                    {chip}
                </PressableOpacity>
            );
        }

        return (
            <View
                accessible={true}
                accessibilityLabel={accessibilityLabel}
                testID={TEST_ID}
            >
                {chip}
            </View>
        );
    }

    return (
        <View
            style={styles.detailRow}
            testID={`${TEST_ID}.detail`}
        >
            <CompassIcon
                name={actionIcon}
                size={24}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
                testID={`${TEST_ID}.detail_icon`}
                accessibilityElementsHidden={true}
                importantForAccessibility='no-hide-descendants'
            />
            <View
                accessible={true}
                accessibilityLabel={accessibilityLabel}
                style={styles.detailText}
            >
                <Text style={styles.detailLabel}>{conciseLabel}</Text>
                {actorName && <Text style={styles.detailInfo}>{actorName}</Text>}
                <Text style={styles.detailDate}>{absoluteTime}</Text>
            </View>
            {avatar && onActorPress ? (
                <PressableOpacity
                    onPress={handlePress}
                    accessibilityRole='button'
                    accessibilityLabel={intl.formatMessage(messages.viewProfile, {actor: actorName})}
                    testID={`${TEST_ID}.actor_button`}
                >
                    {avatar}
                </PressableOpacity>
            ) : avatar}
        </View>
    );
};

export default TaskActivityIndicator;
