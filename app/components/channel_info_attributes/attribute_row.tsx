// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import AttributeChip from '@components/attribute_chip';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {getPropertyFieldLabel, type AttributeEditability, type ResolvedChannelAttribute} from '@utils/channel_attributes';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const ROW_MIN_HEIGHT = 40;

// Ids shared with the webapp so translators see one source string per message.
const lockReasons = defineMessages({
    never: {
        id: 'channel_attributes.info.locked',
        defaultMessage: 'This attribute cannot be changed after it is set',
    },
    raise_only: {
        id: 'channel_attributes.info.locked_raise_only',
        defaultMessage: 'This attribute can only be raised, never lowered',
    },
    lower_only: {
        id: 'channel_attributes.info.locked_lower_only',
        defaultMessage: 'This attribute can only be lowered, never raised',
    },
    permission: {
        id: 'channel_attributes.info.locked_permission',
        defaultMessage: 'You do not have permission to change this attribute',
    },
    unsupported_type: {
        id: 'channel_attributes.info.locked_unsupported',
        defaultMessage: 'This attribute cannot be changed on mobile',
    },
});

const messages = defineMessages({
    notSet: {
        id: 'channel_attributes.info.not_set',
        defaultMessage: 'Not set',
    },
    saveFailed: {
        id: 'channel_attributes.info.save_failed',
        defaultMessage: "Couldn't save {label}. Try again.",
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: ROW_MIN_HEIGHT,
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
    lock: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginTop: 2,
        ...typography('Body', 75),
    },
    error: {
        color: theme.errorTextColor,
        marginTop: 2,
        ...typography('Body', 75),
    },
}));

type Props = {
    attribute: ResolvedChannelAttribute;
    editability: AttributeEditability;

    // Whether to explain a lock. A policy lock is always explained; a permission
    // lock only where the viewer can edit other attributes on this channel, so a
    // plain member is not told three times over that they cannot edit anything.
    showLockReason: boolean;

    failed: boolean;
    onPress: (fieldId: string) => void;
};

const AttributeRow = ({attribute, editability, showLockReason, failed, onPress}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const {field, displayValue, option} = attribute;
    const label = getPropertyFieldLabel(field);
    const testID = `channel_info.attributes.${field.name}`;

    // The field id comes back through the callback so the parent can pass one
    // memoized handler to every row.
    const handlePress = useCallback(() => onPress(field.id), [field.id, onPress]);

    const value = (
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
            {editability.editable && (
                <CompassIcon
                    name='chevron-right'
                    style={styles.chevron}
                />
            )}
        </View>
    );

    const content = (
        <>
            {/* The attribute's own name: dynamic and not translatable. */}
            <Text
                style={styles.label}
                numberOfLines={1}
            >
                {label}
            </Text>
            {value}
        </>
    );

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            {editability.editable ? (
                <Pressable
                    onPress={handlePress}
                    style={({pressed}) => [styles.row, pressed && styles.pressed]}
                    accessibilityRole='button'
                    accessibilityLabel={`${label}: ${displayValue || intl.formatMessage(messages.notSet)}`}
                    testID={`${testID}.edit`}
                >
                    {content}
                </Pressable>
            ) : (
                <View style={styles.row}>{content}</View>
            )}

            {!editability.editable && showLockReason && (
                <FormattedText
                    {...lockReasons[editability.reason]}
                    style={styles.lock}
                    testID={`${testID}.lock`}
                />
            )}

            {failed && (
                <FormattedText
                    {...messages.saveFailed}
                    values={{label}}
                    style={styles.error}
                    accessibilityRole='alert'
                    testID={`${testID}.error`}
                />
            )}
        </View>
    );
};

export default AttributeRow;
