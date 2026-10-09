// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderRadius: 4,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    header: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 4,
    },
    headerPressed: {
        opacity: 0.72,
    },
    headerText: {
        ...typography('Body', 75, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        flexShrink: 0,
        alignItems: 'center',
        paddingRight: 4,
    },
    actionButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    actionButtonPressed: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
    },
    actionText: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.buttonBg,
    },
    body: {
        gap: 12,
        paddingTop: 4,
        paddingBottom: 12,
        paddingHorizontal: 12,
        paddingLeft: 28,
    },
    field: {
        gap: 4,
    },
    reqLabel: {
        ...typography('Body', 75, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
    reqValue: {
        minHeight: 32,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        borderRadius: 4,
        backgroundColor: theme.centerChannelBg,
        ...typography('Body', 100, 'Regular'),
        color: theme.centerChannelColor,
    },
    placeholder: {
        minHeight: 32,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderRadius: 4,
        ...typography('Body', 75, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.48),
        fontStyle: 'italic',
    },
}));

type Props = {
    requirements: TaskRequirement[];
    isTaskComplete?: boolean;
    onEditValues?: () => void;
    onComplete?: () => void;
    readOnly?: boolean;
};

const RequirementsAccordion = ({
    requirements,
    isTaskComplete,
    onEditValues,
    onComplete,
    readOnly,
}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [expanded, setExpanded] = useState(false);
    const rotation = useSharedValue(0);

    const filledCount = useMemo(
        () => requirements.filter((r) => (r.value || '').trim() !== '').length,
        [requirements],
    );
    const showValues = filledCount > 0;

    const headerLabel = useMemo(() => {
        if (showValues) {
            return formatMessage(
                {
                    id: 'playbooks.checklist_item.requirements.required_fields',
                    defaultMessage: '{count, plural, one {# required field} other {# required fields}}',
                },
                {count: requirements.length},
            );
        }

        return formatMessage(
            {
                id: 'playbooks.checklist_item.requirements.count',
                defaultMessage: '{count, plural, one {# requirement} other {# requirements}}',
            },
            {count: requirements.length},
        );
    }, [formatMessage, requirements.length, showValues]);

    const emptyValuePlaceholder = formatMessage({
        id: 'playbooks.checklist_item.requirements.empty_value',
        defaultMessage: '—',
    });

    const notFilledYet = formatMessage({
        id: 'playbooks.checklist_item.requirements.not_filled',
        defaultMessage: 'Not filled yet',
    });

    const toggleExpanded = useCallback(() => {
        const next = !expanded;
        setExpanded(next);
        rotation.value = withTiming(next ? 90 : 0, {duration: 150});
    }, [expanded, rotation]);

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${rotation.value}deg`}],
    }));

    if (!requirements.length) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='task-requirements-accordion'
        >
            <View style={styles.headerRow}>
                <Pressable
                    style={({pressed}) => [styles.header, pressed && styles.headerPressed]}
                    onPress={toggleExpanded}
                    accessibilityState={{expanded}}
                >
                    <Animated.View style={chevronStyle}>
                        <CompassIcon
                            name='chevron-right'
                            size={12}
                            color={changeOpacity(theme.centerChannelColor, 0.72)}
                        />
                    </Animated.View>
                    <Text
                        style={styles.headerText}
                        numberOfLines={1}
                    >
                        {headerLabel}
                    </Text>
                </Pressable>
                {!readOnly && (
                    <View style={styles.actions}>
                        {!isTaskComplete && !showValues && onComplete && (
                            <Pressable
                                style={({pressed}) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                                onPress={onComplete}
                                testID='complete-requirement-values'
                            >
                                <Text style={styles.actionText}>
                                    {formatMessage({
                                        id: 'playbooks.checklist_item.requirements.complete',
                                        defaultMessage: 'Complete',
                                    })}
                                </Text>
                            </Pressable>
                        )}
                        {onEditValues && (showValues || isTaskComplete) && (
                            <Pressable
                                style={({pressed}) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                                onPress={onEditValues}
                                testID='edit-requirement-values'
                            >
                                <Text style={styles.actionText}>
                                    {formatMessage({
                                        id: 'playbooks.checklist_item.requirements.edit',
                                        defaultMessage: 'Edit',
                                    })}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
            {expanded && (
                <View style={styles.body}>
                    {requirements.map((req) => {
                        const hasValue = (req.value || '').trim() !== '';
                        let body: React.ReactNode;
                        if (showValues || hasValue) {
                            body = (
                                <Text style={styles.reqValue}>
                                    {req.value || emptyValuePlaceholder}
                                </Text>
                            );
                        } else {
                            body = (
                                <Text style={styles.placeholder}>
                                    {notFilledYet}
                                </Text>
                            );
                        }

                        return (
                            <View
                                key={req.id}
                                style={styles.field}
                            >
                                <Text style={styles.reqLabel}>{req.label}</Text>
                                {body}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default RequirementsAccordion;
