// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import AttributeChip, {attributeChipGroupStyle} from '@components/attribute_chip';
import FormattedText from '@components/formatted_text';
import {NEUTRAL_CHIP_HEADER_BG, NEUTRAL_CHIP_HEADER_TEXT} from '@constants/channel_attributes';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import BottomSheetContent, {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {flattenChannelAttributesToChips, groupChannelAttributeChipsByField, type ChannelAttributeChipItem, type ResolvedChannelAttribute} from '@utils/channel_attributes';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const CHIP_TEST_ID_PREFIX = 'channel_attribute_labels.chip';

// Maximum number of individual value chips to show inline, counted across all
// attributes rather than per attribute — a single multi-valued attribute (e.g.
// a graph field with several selected nodes) can exceed this on its own, and
// the excess still goes to the +N overflow sheet the same as it would for
// several single-valued attributes. Two keeps the header subtitle row
// readable on narrow screens.
const MAX_VISIBLE_CHIP_VALUES = 2;

const CHIP_GAP = 4;
const SHEET_ROW_HEIGHT = 44;
const SHEET_MAX_ROWS = 5;

// Rough estimate of how many chips fit on one sheet row before wrapping, used
// only to size the sheet's initial snap point — not a measurement.
const CHIPS_PER_LINE_ESTIMATE = 4;

const messages = defineMessages({
    overflow: {
        id: 'channel_attributes.labels.overflow',
        defaultMessage: '+{count}',
    },
    overflowAccessibility: {
        id: 'channel_attributes.labels.overflow_aria',
        defaultMessage: '{count, plural, one {# more attribute value} other {# more attribute values}}',
    },
    sheetTitle: {
        id: 'channel_attributes.labels.sheet_title',
        defaultMessage: 'Channel Attributes',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: CHIP_GAP,
        minWidth: 0,
        flexShrink: 1,
    },
    valueGroup: attributeChipGroupStyle,
    overflow: {
        paddingHorizontal: 6,
        borderRadius: 4,
        backgroundColor: NEUTRAL_CHIP_HEADER_BG,
    },
    overflowText: {
        ...typography('Body', 25, 'SemiBold'),
        color: NEUTRAL_CHIP_HEADER_TEXT,
    },
    pressed: {
        opacity: 0.72,
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: SHEET_ROW_HEIGHT,
        paddingVertical: 6,
    },
    sheetLabel: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
        flexShrink: 1,
    },
}));

type Props = {
    attributes: ResolvedChannelAttribute[];
};

type OverflowGroupRowProps = {
    group: {fieldId: string; label: string; items: ChannelAttributeChipItem[]};
    styles: ReturnType<typeof getStyleSheet>;
};

// Extracted so the overflow sheet's group-of-chips row isn't an inline
// callback nested inside another inline callback (max-nested-callbacks).
const OverflowGroupRow = ({group, styles}: OverflowGroupRowProps) => (
    <View style={styles.sheetRow}>
        <Text
            style={styles.sheetLabel}
            numberOfLines={1}
        >
            {group.label}
        </Text>
        <View style={styles.valueGroup}>
            {group.items.map((item) => (
                <AttributeChip
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    color={item.color}
                    announceLabel={false}
                    testID={item.testID}
                />
            ))}
        </View>
    </View>
);

/**
 * The channel's designated attribute values as chips, for the channel header.
 *
 * Shows at most MAX_VISIBLE_CHIP_VALUES value chips inline, counted across all
 * attributes. Additional values are reachable through the +N overflow
 * affordance, which opens a bottom sheet.
 *
 * Chips are informational. Nothing here enforces access, and no string may
 * suggest otherwise.
 */
const ChannelAttributeLabels = ({attributes}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // Memoized so the reference is stable when attributes are unchanged, which
    // keeps the usePreventDoubleTap closure from being recreated on every render
    // (a new closure instance resets the double-tap guard).
    const chipItems = useMemo(() => flattenChannelAttributesToChips(attributes, CHIP_TEST_ID_PREFIX), [attributes]);
    const visibleCount = Math.min(chipItems.length, MAX_VISIBLE_CHIP_VALUES);
    const visible = useMemo(() => chipItems.slice(0, visibleCount), [chipItems, visibleCount]);
    const overflowed = useMemo(() => chipItems.slice(visibleCount), [chipItems, visibleCount]);
    const overflowedGroups = useMemo(() => groupChannelAttributeChipsByField(overflowed), [overflowed]);

    const showOverflow = usePreventDoubleTap(useCallback(() => {
        const renderContent = () => (
            <BottomSheetContent
                showButton={false}
                showTitle={true}
                title={intl.formatMessage(messages.sheetTitle)}
                testID='channel_attribute_labels.overflow_sheet'
            >
                {overflowedGroups.map((group) => (
                    <OverflowGroupRow
                        key={group.fieldId}
                        group={group}
                        styles={styles}
                    />
                ))}
            </BottomSheetContent>
        );

        // A group's row can wrap to more than one line once its chips no longer fit
        // on one, so its height is estimated in line units rather than assumed to
        // always be SHEET_ROW_HEIGHT. This is a rough estimate, not a measurement,
        // so '80%' is always offered as a taller snap point the user can drag to
        // if a field with many values wraps to more lines than estimated.
        const estimatedRows = overflowedGroups.reduce(
            (total, group) => total + Math.max(1, Math.ceil(group.items.length / CHIPS_PER_LINE_ESTIMATE)),
            0,
        );
        const height = bottomSheetSnapPoint(Math.min(estimatedRows, SHEET_MAX_ROWS), SHEET_ROW_HEIGHT) + (2 * TITLE_HEIGHT);
        const snapPoints: Array<string | number> = [1, height, '80%'];

        bottomSheet(renderContent, snapPoints);
    }, [intl, overflowedGroups, styles]));

    if (chipItems.length === 0) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='channel_attribute_labels'
        >
            {visible.map((item) => (
                <AttributeChip
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    color={item.color}
                    variant='header'
                    testID={item.testID}
                />
            ))}

            {overflowed.length > 0 && (
                <Pressable
                    onPress={showOverflow}
                    style={({pressed}) => [styles.overflow, pressed && styles.pressed]}
                    accessibilityRole='button'
                    accessibilityLabel={intl.formatMessage(messages.overflowAccessibility, {count: overflowed.length})}
                    testID='channel_attribute_labels.overflow'
                >
                    <FormattedText
                        {...messages.overflow}
                        values={{count: overflowed.length}}
                        style={styles.overflowText}
                    />
                </Pressable>
            )}
        </View>
    );
};

export default ChannelAttributeLabels;
