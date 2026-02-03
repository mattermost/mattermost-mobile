// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Agent} from '@agents/client/rest';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, type ListRenderItemInfo, Text, TouchableOpacity, View} from 'react-native';

import {buildProfileImageUrl} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import AgentItem from './agent_item';

type Props = {
    agents: Agent[];
    currentAgentUsername: string;
    onSelectAgent: (agent: Agent) => void;
    onBack: () => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
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

    const keyExtractor = useCallback((agent: Agent) => agent.id || agent.username, []);

    const renderItem = useCallback(({item: agent}: ListRenderItemInfo<Agent>) => {
        const profileImageUrl = agent.id ? agentImageUrls[agent.id] : undefined;
        return (
            <AgentItem
                agent={agent}
                profileImageUrl={profileImageUrl}
                currentAgentUsername={currentAgentUsername}
                onSelect={onSelectAgent}
            />
        );
    }, [agentImageUrls, currentAgentUsername, onSelectAgent]);

    const renderSeparator = useCallback(() => (
        <View style={styles.divider}/>
    ), [styles.divider]);

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
                {intl.formatMessage({id: 'agents.selector.no_agents', defaultMessage: 'No agents available'})}
            </Text>
        </View>
    ), [intl, styles.emptyContainer, styles.emptyText]);

    const renderHeader = useCallback(() => (
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
    ), [intl, onBack, styles.backButton, styles.headerRow, styles.headerTitle, theme.centerChannelColor]);

    return (
        <View style={styles.container}>
            <FlatList
                data={agents}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={renderEmpty}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default AgentSelectorPanel;
