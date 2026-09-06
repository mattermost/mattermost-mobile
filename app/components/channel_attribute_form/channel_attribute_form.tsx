// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, View, type LayoutChangeEvent} from 'react-native';

import AttributeChip from '@components/attribute_chip';
import ChannelAttributeEditor, {OPTION_ROW_HEIGHT} from '@components/channel_attribute_editor';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {
    getPropertyFieldLabel,
    reachableOptions,
    resolveChannelAttributes,
    type ChannelAttributeField,
    type ResolvedChannelAttribute,
} from '@utils/channel_attributes';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ChannelAttributeValueInput} from '@actions/remote/channel_attributes';

// Past this the sheet takes a percentage snap point and scrolls, rather than
// growing to a height that would cover the screen. Mirrors PR A's editor sheet.
const SHEET_MAX_ROWS = 5;

const messages = defineMessages({
    heading: {
        id: 'channel_attributes.info.heading',
        defaultMessage: 'Channel Attributes',
    },
    notSet: {
        id: 'channel_attributes.info.not_set',
        defaultMessage: 'Not set',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        gap: 4,
    },
    heading: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 75),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 40,
        paddingVertical: 4,
    },
    pressed: {
        opacity: 0.72,
    },
    label: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
        flexShrink: 1,
    },
    value: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    notSet: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 200),
    },
    chevron: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        fontSize: 18,
    },
}));

type RowProps = {
    attribute: ResolvedChannelAttribute;
    onPress: (fieldId: string) => void;
};

/**
 * One attribute row. Always editable and never explains a lock: every field
 * reaching this form already passed observeCreatableChannelAttributeFields,
 * which drops anything the caller could not set, so there is nothing left here
 * to refuse.
 */
const FormRow = ({attribute, onPress}: RowProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const {field, displayValue, option} = attribute;
    const label = getPropertyFieldLabel(field);
    const testID = `channel_attribute_form.${field.name}`;

    const handlePress = useCallback(() => onPress(field.id), [field.id, onPress]);

    return (
        <Pressable
            onPress={handlePress}
            style={({pressed}) => [styles.row, pressed && styles.pressed]}
            accessibilityRole='button'
            accessibilityLabel={`${label}: ${displayValue || intl.formatMessage(messages.notSet)}`}
            testID={`${testID}.edit`}
        >
            <Text
                style={styles.label}
                numberOfLines={1}
            >
                {label}
            </Text>
            <View style={styles.value}>
                {displayValue ? (
                    <AttributeChip
                        label={label}
                        value={displayValue}
                        color={option?.color}
                        announceLabel={false}
                        testID={`${testID}.chip`}
                    />
                ) : (
                    <FormattedText
                        {...messages.notSet}
                        style={styles.notSet}
                        testID={`${testID}.not_set`}
                    />
                )}
                <CompassIcon
                    name='chevron-right'
                    style={styles.chevron}
                />
            </View>
        </Pressable>
    );
};

export type ChannelAttributeFormValues = Record<string, string | string[]>;

type Props = {
    type?: string;
    fields: ChannelAttributeField[];
    values: ChannelAttributeFormValues;
    onChange: (fieldId: string, value: ChannelAttributeValueInput) => void;
    onLayout?: (e: LayoutChangeEvent) => void;
};

/**
 * The required channel attributes offered while creating a channel.
 *
 * Reuses PR A's Set {attribute} sheet rather than building a second editor: the
 * only difference at create time is that a submit updates local state instead of
 * writing to the server, which is why onChange is a plain setter here rather than
 * setChannelAttributeValue.
 *
 * No change-policy narrowing: there is no channel yet, so nothing has been
 * written for a policy to lock. Every option is reachable and clearing is always
 * offered — the editor is told to ignore the policy via unlockOptions rather than
 * having its rawValue stripped, so reopening the sheet still pre-selects (or
 * pre-fills) whatever was chosen last, instead of discarding it.
 */
const ChannelAttributeForm = ({type, fields, values, onChange, onLayout}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const valuesList = useMemo(
        () => fields.map((field) => ({fieldId: field.id, value: values[field.id]})),
        [fields, values],
    );
    const resolved = useMemo(() => resolveChannelAttributes(fields, valuesList), [fields, valuesList]);

    const handleRowPress = useCallback((fieldId: string) => {
        const attribute = resolved.find((candidate) => candidate.field.id === fieldId);
        if (!attribute) {
            return;
        }

        const renderContent = () => (
            <ChannelAttributeEditor
                attribute={attribute}
                clearable={true}
                unlockOptions={true}
                onSubmit={onChange}
            />
        );

        const {field} = attribute;
        const sheetRows = field.type === 'text' ? 1 : reachableOptions(field, undefined).length + 1;
        const height = bottomSheetSnapPoint(Math.min(sheetRows, SHEET_MAX_ROWS), OPTION_ROW_HEIGHT) + (2 * TITLE_HEIGHT);
        const snapPoints: Array<string | number> = [1, height];
        if (sheetRows > SHEET_MAX_ROWS) {
            snapPoints.push('80%');
        }

        bottomSheet(renderContent, snapPoints);
    }, [resolved, onChange]);

    // DM/GM never reach this form on mobile (no channel-attribute UI is offered
    // there); O/P are the only channel types the create screen ever produces.
    if (fields.length === 0 || (type !== General.OPEN_CHANNEL && type !== General.PRIVATE_CHANNEL)) {
        return null;
    }

    return (
        <View
            style={styles.container}
            onLayout={onLayout}
            testID='channel_attribute_form'
        >
            <FormattedText
                {...messages.heading}
                style={styles.heading}
            />
            {resolved.map((attribute) => (
                <FormRow
                    key={attribute.field.id}
                    attribute={attribute}
                    onPress={handleRowPress}
                />
            ))}
        </View>
    );
};

export default ChannelAttributeForm;
