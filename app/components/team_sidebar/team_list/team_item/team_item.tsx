// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {handleTeamChange} from '@actions/local/team';
import Badge from '@components/badge';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

import TeamIcon from './team_icon';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    team: TeamModel;
    hasUnreads: boolean;
    mentionCount: number;
    currentTeamId: string;
}

export default function TeamItem({team, hasUnreads, mentionCount, currentTeamId}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const selected = team.id === currentTeamId;

    const hasBadge = Boolean(mentionCount || hasUnreads);
    let mentionText = mentionCount ? mentionCount.toString() : '';
    let left = 35;
    switch (true) {
        case mentionCount > 99:
            mentionText = '99+';
            left = 20;
            break;
        case mentionCount > 9:
            left = 26;
            break;
    }

    return (
        <>
            <View style={selected ? styles.containerSelected : styles.container}>
                <TouchableWithFeedback
                    onPress={() => handleTeamChange(serverUrl, team.id)}
                    type='opacity'
                >
                    <TeamIcon
                        displayName={team.displayName}
                        id={team.id}
                        lastIconUpdate={team.lastTeamIconUpdatedAt}
                        selected={selected}
                    />
                </TouchableWithFeedback>
            </View>
            <Badge
                visible={hasBadge && !selected}
                style={mentionCount > 0 ? [styles.mentions, {left}] : styles.unread}
                size={mentionCount > 0 ? 16 : 12}
            >
                {mentionText}
            </Badge>
        </>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 48,
            width: 48,
            flex: 0,
            borderRadius: 10,
            marginVertical: 6,
            overflow: 'hidden',
        },
        containerSelected: {
            height: 48,
            width: 48,
            padding: 3,
            borderWidth: 3,
            borderColor: theme.sidebarTextActiveBorder,
            borderRadius: 10,
            marginVertical: 6,
        },
        unread: {
            left: 40,
            top: 3,
            borderColor: theme.sidebarTeamBarBg,
            borderWidth: 2,
            backgroundColor: theme.mentionBg,
            width: 12,
        },
        mentions: {
            top: 1,
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'OpenSans',
            lineHeight: 15,
            borderColor: theme.sidebarTeamBarBg,
            alignItems: 'center',
            borderWidth: 2,
            minWidth: 22,
            height: 18,
            borderRadius: 9,
            backgroundColor: theme.mentionBg,
            color: theme.mentionColor,
        },
    };
});
