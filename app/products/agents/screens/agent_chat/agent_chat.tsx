// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAIBots, getBotDirectChannel, type LLMBot} from '@agents/actions/remote/bots';
import {goToAgentThreadsList} from '@agents/screens/navigation';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, View, Text, TouchableOpacity, ActivityIndicator, ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {buildProfileImageUrl} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import PostDraft from '@components/post_draft';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Screens} from '@constants';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet, dismissBottomSheet, popTopScreen} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    currentUserId: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
    },
    headerContainer: {
        backgroundColor: theme.sidebarBg,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: 8,
    },
    headerLeft: {
        width: 100,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    headerIconButton: {
        padding: 10,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: theme.sidebarText,
        fontFamily: 'Metropolis-SemiBold',
        fontSize: 18,
        lineHeight: 24,
    },
    headerSubtitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    headerSubtitleText: {
        color: changeOpacity(theme.sidebarText, 0.72),
        fontFamily: 'OpenSans',
        fontSize: 12,
        lineHeight: 16,
    },
    headerRight: {
        width: 100,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 8,
        gap: 4,
    },
    mainContent: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.centerChannelColor,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginBottom: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
    },
    errorText: {
        fontSize: 14,
        color: theme.errorTextColor,
        textAlign: 'center',
        marginTop: 16,
    },
}));

const AgentChat = ({
    componentId,
    currentUserId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const styles = getStyleSheet(theme);

    const [bots, setBots] = useState<LLMBot[]>([]);
    const [selectedBot, setSelectedBot] = useState<LLMBot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [channelId, setChannelId] = useState<string | null>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const loadBots = async () => {
            setLoading(true);
            const {bots: fetchedBots, error: fetchError} = await fetchAIBots(serverUrl);
            setLoading(false);

            if (fetchError) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_loading_bots',
                    defaultMessage: 'Failed to load agents. Please try again.',
                }));
                return;
            }

            if (fetchedBots && fetchedBots.length > 0) {
                setBots(fetchedBots);
                setSelectedBot(fetchedBots[0]);
            } else {
                setError(intl.formatMessage({
                    id: 'agents.chat.no_bots',
                    defaultMessage: 'No agents available.',
                }));
            }
        };

        loadBots();
    }, [serverUrl, intl]);

    // Get or create DM channel when bot is selected
    useEffect(() => {
        const getChannel = async () => {
            if (!selectedBot) {
                setChannelId(null);
                return;
            }

            const {channelId: dmChannelId, error: channelError} = await getBotDirectChannel(
                serverUrl,
                currentUserId,
                selectedBot.id,
            );

            if (channelError || !dmChannelId) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_creating_channel',
                    defaultMessage: 'Failed to start conversation. Please try again.',
                }));
                return;
            }

            setChannelId(dmChannelId);
        };

        getChannel();
    }, [selectedBot, serverUrl, currentUserId, intl]);

    const exit = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, exit);

    const handleHistoryPress = useCallback(() => {
        goToAgentThreadsList(intl);
    }, [intl]);

    const handleBotSelect = useCallback((bot: LLMBot) => {
        setSelectedBot(bot);
        dismissBottomSheet();
    }, []);

    const handleBotSelectorPress = usePreventDoubleTap(useCallback(() => {
        if (bots.length <= 1) {
            return;
        }

        const renderContent = () => {
            return (
                <>
                    {bots.map((bot) => {
                        const avatarUrl = buildAbsoluteUrl(
                            serverUrl,
                            buildProfileImageUrl(serverUrl, bot.id, bot.lastIconUpdate),
                        );

                        return (
                            <SlideUpPanelItem
                                key={bot.id}
                                leftIcon={{uri: avatarUrl}}
                                leftImageStyles={{borderRadius: 12}}
                                onPress={() => handleBotSelect(bot)}
                                testID={`agent_chat.bot_selector.bot_item.${bot.id}`}
                                text={bot.displayName}
                                rightIcon={selectedBot?.id === bot.id ? 'check' : undefined}
                                rightIconStyles={{color: theme.linkColor}}
                            />
                        );
                    })}
                </>
            );
        };

        const snapPoint = bottomSheetSnapPoint(bots.length, ITEM_HEIGHT);
        bottomSheet({
            closeButtonId: 'close-bot-selector',
            renderContent,
            snapPoints: [1, (snapPoint + TITLE_HEIGHT)],
            title: intl.formatMessage({
                id: 'agents.chat.select_agent',
                defaultMessage: 'Select an agent',
            }),
            theme,
        });
    }, [bots, selectedBot, theme, intl, handleBotSelect, serverUrl]));

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const handlePostCreated = useCallback((postId: string) => {
        fetchAndSwitchToThread(serverUrl, postId);
    }, [serverUrl]);

    if (loading) {
        return (
            <View style={[styles.container, {paddingTop: insets.top}]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size='large'
                        color={theme.buttonBg}
                    />
                </View>
            </View>
        );
    }

    return (
        <View
            style={styles.container}
            onLayout={onLayout}
        >
            {/* Header */}
            <View style={[styles.headerContainer, {paddingTop: insets.top}]}>
                <View style={styles.headerContent}>
                    {/* Left - Back button */}
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            onPress={exit}
                            style={styles.headerIconButton}
                            testID='agent_chat.back_button'
                        >
                            <CompassIcon
                                name='arrow-left'
                                size={20}
                                color={changeOpacity(theme.sidebarText, 0.56)}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Center - Title and bot selector */}
                    <TouchableOpacity
                        onPress={handleBotSelectorPress}
                        style={styles.headerCenter}
                        disabled={bots.length <= 1}
                        testID='agent_chat.bot_selector'
                    >
                        <Text style={styles.headerTitle}>
                            {intl.formatMessage({
                                id: 'agents.chat.title',
                                defaultMessage: 'Agents',
                            })}
                        </Text>
                        <View style={styles.headerSubtitle}>
                            <Text style={styles.headerSubtitleText}>
                                {selectedBot?.displayName || intl.formatMessage({
                                    id: 'agents.chat.select_agent',
                                    defaultMessage: 'Select an agent',
                                })}
                            </Text>
                            {bots.length > 1 && (
                                <CompassIcon
                                    name='chevron-down'
                                    size={12}
                                    color={changeOpacity(theme.sidebarText, 0.72)}
                                />
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Right - History icon */}
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={handleHistoryPress}
                            style={styles.headerIconButton}
                            testID='agent_chat.history_button'
                        >
                            <CompassIcon
                                name='clock-outline'
                                size={20}
                                color={theme.sidebarText}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Main content */}
            <View style={styles.mainContent}>
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{flexGrow: 1}}
                >
                    <Text style={styles.welcomeText}>
                        {intl.formatMessage({
                            id: 'agents.chat.welcome',
                            defaultMessage: 'Start a conversation with an agent',
                        })}
                    </Text>
                    <Text style={styles.descriptionText}>
                        {intl.formatMessage({
                            id: 'agents.chat.description',
                            defaultMessage: 'Type a message below to start a new conversation. You can view your past conversations by tapping the history icon above.',
                        })}
                    </Text>
                    {error && <Text style={styles.errorText}>{error}</Text>}
                </ScrollView>

                {channelId && (
                    <ExtraKeyboardProvider>
                        <PostDraft
                            channelId={channelId}
                            testID='agent_chat.post_draft'
                            containerHeight={containerHeight}
                            isChannelScreen={false}
                            location={Screens.AGENT_CHAT}
                            onPostCreated={handlePostCreated}
                        />
                    </ExtraKeyboardProvider>
                )}
            </View>
        </View>
    );
};

export default AgentChat;
