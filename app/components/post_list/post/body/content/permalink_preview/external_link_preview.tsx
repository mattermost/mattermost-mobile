// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text, TouchableOpacity} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useExternalLinkHandler} from '@hooks/use_external_link_handler';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ExternalLinkData = {
    url: string;
    data: Record<string, unknown>;
};

type ExternalLinkPreviewProps = {
    embeds?: PostEmbed[];
    testID?: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        externalLinkContainer: {
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderWidth: 1,
            borderRadius: 4,
            padding: 12,
        },
        externalLinkTitle: {
            color: theme.linkColor,
            ...typography('Body', 100, 'SemiBold'),
            marginBottom: 4,
        },
        externalLinkUrl: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
    };
});

const ExternalLinkPreview = ({embeds, testID = 'external-link-preview'}: ExternalLinkPreviewProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const externalLinkData = useMemo((): ExternalLinkData | null => {
        if (!embeds || embeds.length === 0) {
            return null;
        }

        const linkEmbed = embeds.find((embed) => embed.type === 'opengraph');
        if (!linkEmbed) {
            return null;
        }

        return {
            url: linkEmbed.url,
            data: linkEmbed.data,
        };
    }, [embeds]);

    const handleExternalLinkPress = useExternalLinkHandler(externalLinkData?.url);

    if (!externalLinkData) {
        return null;
    }

    return (
        <TouchableOpacity
            style={styles.externalLinkContainer}
            onPress={handleExternalLinkPress}
            testID={testID}
        >
            {externalLinkData.data?.title || externalLinkData.data?.site_name ? (
                <Text
                    style={styles.externalLinkTitle}
                    numberOfLines={2}
                    ellipsizeMode='tail'
                >
                    {String(externalLinkData.data.title || externalLinkData.data.site_name)}
                </Text>
            ) : (
                <FormattedText
                    id='mobile.permalink_preview.external_link'
                    defaultMessage='External Link'
                    style={styles.externalLinkTitle}
                    numberOfLines={2}
                    ellipsizeMode='tail'
                />
            )}
            <Text
                style={styles.externalLinkUrl}
                numberOfLines={1}
                ellipsizeMode='tail'
            >
                {String(externalLinkData.data?.description || externalLinkData.url)}
            </Text>
        </TouchableOpacity>
    );
};

export default ExternalLinkPreview;
