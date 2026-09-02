// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import {NEUTRAL_CHIP_HEADER_BG, NEUTRAL_CHIP_HEADER_TEXT} from '@constants/channel_attributes';
import {useTheme} from '@context/theme';
import {getContrastingSimpleColor} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

// Hard character cap per chip. Values longer than this are truncated with an
// ellipsis so one long label cannot consume the whole header row.
const MAX_CHARS = 15;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 6,
        borderRadius: 4,
        justifyContent: 'center',
    },
    neutralContainer: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },

    // Neutral chip for the dark channel header: solid light-gray so it reads
    // clearly on any sidebarBg colour. Text is dark to contrast the light background.
    neutralContainerHeader: {
        backgroundColor: NEUTRAL_CHIP_HEADER_BG,
    },
    text: {
        ...typography('Body', 25, 'SemiBold'),
        textTransform: 'uppercase',
        letterSpacing: 0.2,
    },
    neutralText: {
        color: changeOpacity(theme.centerChannelColor, 0.75),
    },
    neutralTextHeader: {
        color: NEUTRAL_CHIP_HEADER_TEXT,
    },
}));

type Props = {

    // The attribute's name, used for the accessibility label so a screen reader
    // hears which attribute the value belongs to.
    label: string;

    value: string;

    // Hex from the option definition. Absent or malformed falls back to the
    // neutral treatment rather than guessing at a readable foreground.
    color?: string;

    // False where the label is already visible beside the chip, so it is not
    // announced twice.
    announceLabel?: boolean;

    // 'header' for chips inside the dark channel header; 'info' (default) for
    // chips on a light surface such as Channel Info or the overflow sheet.
    // Only affects the neutral fallback colours — option colours are unchanged.
    variant?: 'header' | 'info';

    testID?: string;
};

/**
 * One channel attribute value, as a chip.
 *
 * The value is always rendered as text: colour must never be the only carrier of
 * meaning. The background is administrator-chosen, so the foreground is derived
 * from its luminance with getContrastingSimpleColor, the same helper the channel
 * banner uses.
 *
 * A chip is information, not a control. It reports nothing about access, and no
 * string here may suggest otherwise.
 */
const AttributeChip = ({label, value, color, announceLabel = true, variant = 'info', testID}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const custom = useMemo(() => {
        if (!color) {
            return undefined;
        }

        const foreground = getContrastingSimpleColor(color);
        if (!foreground) {
            // Malformed hex: neutral beats unknown text on an unknown background.
            return undefined;
        }

        return {container: {backgroundColor: color}, text: {color: foreground}};
    }, [color]);

    const neutralBg = variant === 'header' ? styles.neutralContainerHeader : styles.neutralContainer;
    const neutralFg = variant === 'header' ? styles.neutralTextHeader : styles.neutralText;

    const displayValue = value.length > MAX_CHARS ? `${value.slice(0, MAX_CHARS)}…` : value;

    return (
        <View
            style={[styles.container, custom ? custom.container : neutralBg]}
            testID={testID}
        >
            <Text
                style={[styles.text, custom ? custom.text : neutralFg]}
                numberOfLines={1}
                ellipsizeMode='tail'
                accessibilityLabel={announceLabel ? `${label}: ${value}` : value}
                testID={testID ? `${testID}.value` : undefined}
            >
                {displayValue}
            </Text>
        </View>
    );
};

export default AttributeChip;
