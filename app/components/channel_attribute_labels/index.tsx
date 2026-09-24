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
import {flattenChannelAttributesToChips, groupChannelAttributeChipsByField, type ChannelAttributeChipGroup, type ResolvedChannelAttribute} from '@utils/channel_attributes';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const CHIP_TEST_ID_PREFIX = 'channel_attribute_labels.chip';

// The header chips stay mounted behind the sheet, so the sheet's copies need
// their own testIDs or every visible value would match twice.
const SHEET_CHIP_TEST_ID_PREFIX = 'channel_attribute_labels.overflow_sheet.chip';

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

type AttributeGroupRowProps = {
    group: ChannelAttributeChipGroup;
};

const AttributeGroupRow = React.memo(({group}: AttributeGroupRowProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
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
});
AttributeGroupRow.displayName = 'AttributeGroupRow';

/**
 * The channel's designated attribute values as chips, for the channel header.
 *
 * Shows at most MAX_VISIBLE_CHIP_VALUES value chips inline, counted across all
 * attributes. The +N overflow affordance opens a bottom sheet listing every
 * header attribute with all of its values, not only the hidden ones, so a
 * multi-valued attribute split across the header and the overflow reads whole.
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
    const overflowCount = chipItems.length - visibleCount;
    const sheetGroups = useMemo(
        () => groupChannelAttributeChipsByField(flattenChannelAttributesToChips(attributes, SHEET_CHIP_TEST_ID_PREFIX)),
        [attributes],
    );

    const showOverflow = usePreventDoubleTap(useCallback(() => {
        const renderContent = () => (
            <BottomSheetContent
                showButton={false}
                showTitle={true}
                title={intl.formatMessage(messages.sheetTitle)}
                testID='channel_attribute_labels.overflow_sheet'
            >
                {sheetGroups.map((group) => (
                    <AttributeGroupRow
                        key={group.fieldId}
                        group={group}
                    />
                ))}
            </BottomSheetContent>
        );

        // A group's row can wrap to more than one line once its chips no longer fit
        // on one, so its height is estimated in line units rather than assumed to
        // always be SHEET_ROW_HEIGHT. This is a rough estimate, not a measurement.
        const estimatedRows = sheetGroups.reduce(
            (total, group) => total + Math.max(1, Math.ceil(group.items.length / CHIPS_PER_LINE_ESTIMATE)),
            0,
        );
        const height = bottomSheetSnapPoint(Math.min(estimatedRows, SHEET_MAX_ROWS), SHEET_ROW_HEIGHT) + (2 * TITLE_HEIGHT);

        // Only offer the taller snap point when the rows exceed the capped height.
        // The sheet lays its content out at the tallest snap point, so an '80%'
        // offered for a single row leaves that row in a mostly off-screen container.
        const snapPoints: Array<string | number> = [1, height];
        if (estimatedRows > SHEET_MAX_ROWS) {
            snapPoints.push('80%');
        }

        bottomSheet(renderContent, snapPoints);
    }, [intl, sheetGroups]));

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

            {overflowCount > 0 && (
                <Pressable
                    onPress={showOverflow}
                    style={({pressed}) => [styles.overflow, pressed && styles.pressed]}
                    accessibilityRole='button'
                    accessibilityLabel={intl.formatMessage(messages.overflowAccessibility, {count: overflowCount})}
                    testID='channel_attribute_labels.overflow'
                >
                    <FormattedText
                        {...messages.overflow}
                        values={{count: overflowCount}}
                        style={styles.overflowText}
                    />
                </Pressable>
            )}
        </View>
    );
};

export default ChannelAttributeLabels;
