// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';
import {Text, View} from 'react-native';

import AttributeChip from '@components/attribute_chip';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {getPropertyFieldLabel, type ResolvedChannelAttribute} from '@utils/channel_attributes';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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

// Mirrors the Extra block's stacked-heading treatment, which is the existing
// pattern for a non-option section inside Channel Info.
const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginTop: 16,
        marginBottom: 4,
    },
    heading: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginBottom: 8,
        ...typography('Body', 75),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 28,
    },
    label: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
        flexShrink: 1,
    },
    notSet: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 200),
    },
}));

type Props = {
    attributes: ResolvedChannelAttribute[];
};

/**
 * The CHANNEL ATTRIBUTES block in Channel Info.
 *
 * A required attribute with no value is listed as "Not set" rather than omitted:
 * that empty row is the only thing telling an administrator the channel is
 * incomplete. Optional unset attributes are not listed at all — on the webapp
 * they are reached through Add attribute, which arrives with editing.
 *
 * Editing is deliberately absent here. These rows are read-only until the
 * follow-up story adds the value editor and its two permission gates.
 */
const ChannelInfoAttributes = ({attributes}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    // Returning null here rather than having the parent gate on it: the list is
    // only known by subscribing to it, and Channel Info doing that itself would
    // mean a second subscription to the same query.
    if (attributes.length === 0) {
        return null;
    }

    return (
        <View
            style={styles.container}
            testID='channel_info.attributes'
        >
            <FormattedText
                {...messages.heading}
                style={styles.heading}
            />

            {attributes.map((attribute) => {
                const label = getPropertyFieldLabel(attribute.field);

                return (
                    <View
                        key={attribute.field.id}
                        style={styles.row}
                        testID={`channel_info.attributes.${attribute.field.name}`}
                    >
                        {/* The attribute's own name: dynamic and not translatable. */}
                        <Text
                            style={styles.label}
                            numberOfLines={1}
                        >
                            {label}
                        </Text>

                        {attribute.displayValue ? (
                            <AttributeChip
                                label={label}
                                value={attribute.displayValue}
                                color={attribute.option?.color}
                                announceLabel={false}
                                testID={`channel_info.attributes.${attribute.field.name}.chip`}
                            />
                        ) : (
                            <FormattedText
                                {...messages.notSet}
                                style={styles.notSet}
                                testID={`channel_info.attributes.${attribute.field.name}.not_set`}
                            />
                        )}
                    </View>
                );
            })}
        </View>
    );
};

export default ChannelInfoAttributes;
