// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import CompassIcon from '@components/compass_icon';
import {getFriendlyDate} from '@components/friendly_date';
import PressableOpacity from '@components/pressable_opacity';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {TaskActivity} from './task_activity';
import type UserModel from '@typings/database/models/servers/user';

const TEST_ID = 'playbook_run.checklist_item.task_activity';

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

export const getTaskActivityAbsoluteTime = (intl: IntlShape, timestamp: number, timeZone?: string, isMilitaryTime?: boolean) => {
    // Without an explicit timeZone, formatDate/formatTime fall back to the engine default (UTC on
    // React Native), showing the wrong local time/date. Callers pass the user's resolved timezone.
    const date = intl.formatDate(timestamp, {year: 'numeric', month: 'short', day: 'numeric', timeZone: timeZone || undefined});
    const time = intl.formatTime(timestamp, {hour: 'numeric', minute: '2-digit', hour12: !isMilitaryTime, timeZone: timeZone || undefined});
    return intl.formatMessage({
        id: 'playbooks.checklist_item.activity.absolute_time',
        defaultMessage: '{date} at {time}',
    }, {date, time});
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
    const actionLabel = intl.formatMessage(activity.action === 'check' ? {
        id: 'playbooks.checklist_item.activity.checked',
        defaultMessage: 'Checked',
    } : {
        id: 'playbooks.checklist_item.activity.unchecked',
        defaultMessage: 'Unchecked',
    });
    const actorName = actor ? displayUsername(actor, intl.locale, teammateNameDisplay) : undefined;
    const conciseLabel = intl.formatMessage({
        id: 'playbooks.checklist_item.activity.summary',
        defaultMessage: '{action} {time}',
    }, {action: actionLabel, time: relativeTime});
    const accessibilityLabel = actorName ? intl.formatMessage({
        id: 'playbooks.checklist_item.activity.accessibility_actor',
        defaultMessage: '{action} by {actor}, {relativeTime}, {absoluteTime}',
    }, {action: actionLabel, actor: actorName, relativeTime, absoluteTime}) : intl.formatMessage({
        id: 'playbooks.checklist_item.activity.accessibility',
        defaultMessage: '{action} {relativeTime}, {absoluteTime}',
    }, {action: actionLabel, relativeTime, absoluteTime});
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
        const prefix = (
            <View style={styles.chipPrefix}>
                <CompassIcon
                    name={activity.action === 'check' ? 'check' : 'checkbox-blank-outline'}
                    size={14}
                    style={styles.chipIcon}
                    testID={`${TEST_ID}.icon`}
                />
                {avatar}
            </View>
        );

        return (
            <View
                accessible={true}
                accessibilityLabel={accessibilityLabel}
                testID={TEST_ID}
            >
                <BaseChip
                    testID={`${TEST_ID}.chip`}
                    label={compactTime}
                    prefix={prefix}
                    onPress={actor && onActorPress ? handlePress : undefined}
                />
            </View>
        );
    }

    return (
        <View
            accessible={true}
            accessibilityLabel={accessibilityLabel}
            style={styles.detailRow}
            testID={`${TEST_ID}.detail`}
        >
            <CompassIcon
                name={activity.action === 'check' ? 'check' : 'checkbox-blank-outline'}
                size={24}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
                testID={`${TEST_ID}.detail_icon`}
            />
            <View style={styles.detailText}>
                <Text style={styles.detailLabel}>{conciseLabel}</Text>
                {actorName && <Text style={styles.detailInfo}>{actorName}</Text>}
                <Text style={styles.detailDate}>{absoluteTime}</Text>
            </View>
            {avatar && onActorPress ? (
                <PressableOpacity
                    onPress={handlePress}
                    testID={`${TEST_ID}.actor_button`}
                >
                    {avatar}
                </PressableOpacity>
            ) : avatar}
        </View>
    );
};

export default TaskActivityIndicator;
