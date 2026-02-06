// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Agent} from '@agents/client/rest';
import {Image} from 'expo-image';
import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const AVATAR_SIZE = 32;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    agentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    agentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    agentAvatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    agentAvatarFallback: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        justifyContent: 'center',
        alignItems: 'center',
    },
    agentName: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'Regular'),
    },
}));

type AgentItemProps = {
    agent: Agent;
    profileImageUrl?: string;
    currentAgentUsername: string;
    onSelect: (agent: Agent) => void;
};

const AgentItem = React.memo(({agent, profileImageUrl, currentAgentUsername, onSelect}: AgentItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onSelect(agent);
    }, [onSelect, agent]);

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.agentRow}
            testID={`agents.selector.agent.${agent.username}`}
        >
            <View style={styles.agentInfo}>
                {profileImageUrl ? (
                    <Image
                        source={{uri: profileImageUrl}}
                        style={styles.agentAvatar}
                        placeholder='account-outline'
                    />
                ) : (
                    <View style={styles.agentAvatarFallback}>
                        <CompassIcon
                            name='account-outline'
                            size={20}
                            color={changeOpacity(theme.centerChannelColor, 0.56)}
                        />
                    </View>
                )}
                <Text style={styles.agentName}>
                    {agent.displayName || agent.username}
                </Text>
            </View>
            {currentAgentUsername === agent.username && (
                <CompassIcon
                    name='check'
                    size={24}
                    color={theme.linkColor}
                />
            )}
        </TouchableOpacity>
    );
});
AgentItem.displayName = 'AgentItem';

export default AgentItem;
