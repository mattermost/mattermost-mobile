// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import AttributeChip from '@components/attribute_chip';
import FormattedText from '@components/formatted_text';
import {NEUTRAL_CHIP_HEADER_BG, NEUTRAL_CHIP_HEADER_TEXT} from '@constants/channel_attributes';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import BottomSheetContent, {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {getPropertyFieldLabel, type ResolvedChannelAttribute} from '@utils/channel_attributes';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

// Maximum number of chips to show inline. Additional attributes go into the
// +N overflow sheet. Two keeps the header subtitle row readable on narrow screens.
const MAX_VISIBLE_CHIPS = 2;

const CHIP_GAP = 4;
const SHEET_ROW_HEIGHT = 44;
const SHEET_MAX_ROWS = 5;

const messages = defineMessages({
    overflow: {
        id: 'channel_attributes.labels.overflow',
        defaultMessage: '+{count}',
    },
    overflowAccessibility: {
        id: 'channel_attributes.labels.overflow_aria',
        defaultMessage: '{count, plural, one {# more attribute} other {# more attributes}}',
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
        height: SHEET_ROW_HEIGHT,
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

/**
 * The channel's designated attribute values as chips, for the channel header.
 *
 * Shows at most MAX_VISIBLE_CHIPS chips inline. Additional attributes are
 * reachable through the +N overflow affordance, which opens a bottom sheet.
 *
 * Chips are informational. Nothing here enforces access, and no string may
 * suggest otherwise.
 */
const ChannelAttributeLabels = ({attributes}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const visibleCount = Math.min(attributes.length, MAX_VISIBLE_CHIPS);

    // Memoized so the reference is stable when attributes are unchanged, which
    // keeps the usePreventDoubleTap closure from being recreated on every render
    // (a new closure instance resets the double-tap guard).
    const overflowed = useMemo(() => attributes.slice(visibleCount), [attributes, visibleCount]);

    const showOverflow = usePreventDoubleTap(useCallback(() => {
        const renderContent = () => (
            <BottomSheetContent
                showButton={false}
                showTitle={true}
                title={intl.formatMessage(messages.sheetTitle)}
                testID='channel_attribute_labels.overflow_sheet'
            >
                {overflowed.map((attribute) => (
                    <View
                        key={attribute.field.id}
                        style={styles.sheetRow}
                    >
                        <Text
                            style={styles.sheetLabel}
                            numberOfLines={1}
                        >
                            {getPropertyFieldLabel(attribute.field)}
                        </Text>
                        <AttributeChip
                            label={getPropertyFieldLabel(attribute.field)}
                            value={attribute.displayValue}
                            color={attribute.option?.color}
                            announceLabel={false}
                        />
                    </View>
                ))}
            </BottomSheetContent>
        );

        const height = bottomSheetSnapPoint(Math.min(overflowed.length, SHEET_MAX_ROWS), SHEET_ROW_HEIGHT) + (2 * TITLE_HEIGHT);
        const snapPoints: Array<string | number> = [1, height];
        if (overflowed.length > SHEET_MAX_ROWS) {
            snapPoints.push('80%');
        }

        bottomSheet(renderContent, snapPoints);
    }, [intl, overflowed, styles.sheetLabel, styles.sheetRow]));

    if (attributes.length === 0) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='channel_attribute_labels'
        >
            {attributes.slice(0, visibleCount).map((attribute) => (
                <AttributeChip
                    key={attribute.field.id}
                    label={getPropertyFieldLabel(attribute.field)}
                    value={attribute.displayValue}
                    color={attribute.option?.color}
                    variant='header'
                    testID={`channel_attribute_labels.chip.${attribute.field.name}`}
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
