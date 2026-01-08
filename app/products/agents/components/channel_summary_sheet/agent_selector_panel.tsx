// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Agent} from '@agents/client/rest';
import {Image} from 'expo-image';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {buildProfileImageUrl} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const AVATAR_SIZE = 32;

type Props = {
    agents: Agent[];
    currentAgentUsername: string;
    onSelectAgent: (agent: Agent) => void;
    onBack: () => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        color: theme.centerChannelColor,
        ...typography('Heading', 300, 'SemiBold'),
    },
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
    divider: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 200, 'Regular'),
    },
}));

type AgentItemProps = {
    agent: Agent;
    profileImageUrl?: string;
    currentAgentUsername: string;
    onSelect: (agent: Agent) => void;
    showDivider: boolean;
};

const AgentItem = React.memo(({agent, profileImageUrl, currentAgentUsername, onSelect, showDivider}: AgentItemProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(() => {
        onSelect(agent);
    }, [onSelect, agent]);

    return (
        <React.Fragment>
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
            {showDivider && <View style={styles.divider}/>}
        </React.Fragment>
    );
});
AgentItem.displayName = 'AgentItem';

const AgentSelectorPanel = ({
    agents,
    currentAgentUsername,
    onSelectAgent,
    onBack,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    // Build profile image URLs for all agents
    const agentImageUrls = useMemo(() => {
        const urls: Record<string, string | undefined> = {};
        for (const agent of agents) {
            if (agent.id) {
                urls[agent.id] = buildProfileImageUrl(serverUrl, agent.id);
            }
        }
        return urls;
    }, [agents, serverUrl]);

    return (
        <View style={styles.container}>
            {/* Header with back button */}
            <View style={styles.headerRow}>
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.backButton}
                    testID='agents.selector.back'
                >
                    <CompassIcon
                        name='arrow-left'
                        size={24}
                        color={theme.centerChannelColor}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {intl.formatMessage({id: 'agents.selector.title', defaultMessage: 'Select Agent'})}
                </Text>
            </View>

            {/* Empty state */}
            {agents.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {intl.formatMessage({id: 'agents.selector.no_agents', defaultMessage: 'No agents available'})}
                    </Text>
                </View>
            )}

            {/* Agent list */}
            {agents.map((agent, index) => {
                const profileImageUrl = agent.id ? agentImageUrls[agent.id] : undefined;
                return (
                    <AgentItem
                        key={agent.id || agent.username}
                        agent={agent}
                        profileImageUrl={profileImageUrl}
                        currentAgentUsername={currentAgentUsername}
                        onSelect={onSelectAgent}
                        showDivider={index < agents.length - 1}
                    />
                );
            })}
        </View>
    );
};

export default AgentSelectorPanel;
