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
    let badgeStyle = styles.unread;
    let value = mentionCount;
    if (!mentionCount && hasUnreads) {
        value = -1;
    }

    switch (true) {
        case value > 99:
            badgeStyle = styles.mentionsThreeDigits;
            break;
        case value > 9:
            badgeStyle = styles.mentionsTwoDigits;
            break;
        case value > 0:
            badgeStyle = styles.mentionsOneDigit;
            break;
    }

    return (
        <>
            <View style={[styles.container, selected ? styles.containerSelected : undefined]}>
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
                borderColor={theme.sidebarTeamBarBg}
                visible={hasBadge}
                style={badgeStyle}
                value={value}
            />
        </>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 54,
            width: 54,
            flex: 0,
            padding: 3,
            borderRadius: 10,
            marginVertical: 3,
            overflow: 'hidden',
        },
        containerSelected: {
            borderWidth: 3,
            borderRadius: 12,
            borderColor: theme.sidebarTextActiveBorder,
        },
        unread: {
            left: 40,
            top: 3,
        },
        mentionsOneDigit: {
            top: 1,
            left: 28,
        },
        mentionsTwoDigits: {
            top: 1,
            left: 26,
        },
        mentionsThreeDigits: {
            top: 1,
            left: 23,
        },
    };
});
