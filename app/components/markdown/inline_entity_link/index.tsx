// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, View} from 'react-native';

import {switchToChannelByName} from '@actions/remote/channel';
import {showPermalink} from '@actions/remote/permalink';
import {handleTeamChange} from '@actions/remote/team';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export const INLINE_ENTITY_TYPE = {
    POST: 'POST',
    CHANNEL: 'CHANNEL',
    TEAM: 'TEAM',
} as const;

export type InlineEntityType = typeof INLINE_ENTITY_TYPE[keyof typeof INLINE_ENTITY_TYPE];

type InlineEntityLinkProps = {
    entityType: InlineEntityType;
    entityId: string;
    linkUrl?: string;
};

// Size matches web implementation (18px for mobile, 22px on web)
const CONTAINER_SIZE = 18;
const ICON_SIZE = 10;

// Vertical offset to center the icon with the middle of the text line
// This shifts the icon down to align with the visual center of text (accounting for descenders)
// Using transform translateY for more reliable positioning of inline Views
// TODO: This value is hardcoded for a particular font size and may need adjustment for different text sizes
const VERTICAL_OFFSET = 3;

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({

    // Circular container matching web styling
    container: {
        width: CONTAINER_SIZE,
        height: CONTAINER_SIZE,
        borderRadius: CONTAINER_SIZE / 2,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.12),
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        alignItems: 'center',
        justifyContent: 'center',

        // Use transform for more reliable vertical positioning
        transform: [{translateY: VERTICAL_OFFSET}],
    },
    icon: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
}));

/**
 * Extract team name from a citation URL.
 * URL format: http://server/teamSlug/pl/postId or http://server/teamSlug/channels/channelName
 */
function extractTeamNameFromUrl(url: string): string | undefined {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        // First path segment is typically the team name
        if (pathParts.length > 0) {
            return pathParts[0];
        }
    } catch {
        // URL parsing failed
    }
    return undefined;
}

const InlineEntityLink = ({entityType, entityId, linkUrl}: InlineEntityLinkProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(async () => {
        if (!entityId) {
            return;
        }

        switch (entityType) {
            case INLINE_ENTITY_TYPE.POST: {
                const teamName = linkUrl ? extractTeamNameFromUrl(linkUrl) : undefined;
                await showPermalink(serverUrl, teamName || '', entityId);
                break;
            }
            case INLINE_ENTITY_TYPE.CHANNEL: {
                const teamName = linkUrl ? extractTeamNameFromUrl(linkUrl) : undefined;
                await switchToChannelByName(serverUrl, entityId, teamName);
                break;
            }
            case INLINE_ENTITY_TYPE.TEAM: {
                await handleTeamChange(serverUrl, entityId);
                break;
            }
        }
    }, [entityType, entityId, linkUrl, serverUrl]);

    const preventDoubleTap = usePreventDoubleTap(handlePress);

    return (
        <Text
            onPress={preventDoubleTap}
            testID={`inline_entity_link.${entityType.toLowerCase()}.${entityId}`}
        >
            <View style={styles.container}>
                <CompassIcon
                    name='link-variant'
                    size={ICON_SIZE}
                    color={styles.icon.color}
                />
            </View>
        </Text>
    );
};

export default InlineEntityLink;

