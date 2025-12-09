// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {showPermalink} from '@actions/remote/permalink';
import {handleTeamChange} from '@actions/remote/team';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity} from '@utils/theme';

export const INLINE_ENTITY_TYPE = {
    POST: 'POST',
    CHANNEL: 'CHANNEL',
    TEAM: 'TEAM',
} as const;

export type InlineEntityType = typeof INLINE_ENTITY_TYPE[keyof typeof INLINE_ENTITY_TYPE];

type InlineEntityLinkProps = {
    entityType: InlineEntityType;
    entityId: string;
};

const InlineEntityLink = ({entityType, entityId}: InlineEntityLinkProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const handlePress = useCallback(async () => {
        switch (entityType) {
            case INLINE_ENTITY_TYPE.POST:
                // Navigate to the post using permalink
                await showPermalink(serverUrl, '', entityId);
                break;
            case INLINE_ENTITY_TYPE.CHANNEL:
                // Navigate to the channel by ID
                await switchToChannelById(serverUrl, entityId);
                break;
            case INLINE_ENTITY_TYPE.TEAM:
                // Switch to the team
                await handleTeamChange(serverUrl, entityId);
                break;
        }
    }, [entityType, entityId, serverUrl]);

    const preventDoubleTap = usePreventDoubleTap(handlePress);

    return (
        <Text
            onPress={preventDoubleTap}
            testID={`inline_entity_link.${entityType.toLowerCase()}.${entityId}`}
        >
            <CompassIcon
                name='link-variant'
                size={14}
                color={changeOpacity(theme.linkColor, 0.8)}
            />
        </Text>
    );
};

export default InlineEntityLink;

