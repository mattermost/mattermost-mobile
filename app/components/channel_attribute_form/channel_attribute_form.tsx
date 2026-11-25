// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, useWindowDimensions, View, type LayoutChangeEvent} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import AttributeChip from '@components/attribute_chip';
import ChannelAttributeEditor from '@components/channel_attribute_editor';
import {getChannelAttributeEditorSnapPoints} from '@components/channel_attribute_editor/utils';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {
    getPropertyFieldLabel,
    reachableOptions,
    resolveChannelAttributes,
    type ChannelAttributeField,
    type ResolvedChannelAttribute,
} from '@utils/channel_attributes';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ChannelAttributeValueInput} from '@actions/remote/channel_attributes';

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
 * Always editable: observeCreatableChannelAttributeFields already dropped fields the user can't set.
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
 * Values stay local until the channel is created. No change policy applies yet, so every
 * option is offered and clearing is always allowed.
 */
const ChannelAttributeForm = ({type, fields, values, onChange, onLayout}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {bottom} = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const {height: windowHeight} = useWindowDimensions();

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
        const totalRows = field.type === 'text' ? 1 : reachableOptions(field, undefined).length + 1;
        const snapPoints = getChannelAttributeEditorSnapPoints({totalRows, fieldType: field.type, bottomInset: bottom, isTablet, windowHeight});

        bottomSheet(renderContent, snapPoints, undefined, 'interactive');
    }, [bottom, isTablet, resolved, onChange, windowHeight]);

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
