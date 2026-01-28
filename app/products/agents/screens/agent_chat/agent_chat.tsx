// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAIBots} from '@agents/actions/remote/bots';
import {AgentsIntro} from '@agents/components/illustrations';
import BotSelectorItem from '@agents/screens/agent_chat/bot_selector_item';
import {goToAgentThreadsList} from '@agents/screens/navigation';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {type LayoutChangeEvent, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {createDirectChannel} from '@actions/remote/channel';
import {buildAbsoluteUrl} from '@actions/remote/file';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {buildProfileImageUrl} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import PostDraft from '@components/post_draft';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
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

import type AiBotModel from '@agents/types/database/models/ai_bot';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    bots: AiBotModel[];
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
        justifyContent: 'flex-end',
    },
    introContent: {
        gap: 8,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 32,
    },
    welcomeText: {
        fontSize: 25,
        fontFamily: 'Metropolis-SemiBold',
        lineHeight: 30,
        color: theme.centerChannelColor,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.centerChannelColor,
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
    bots,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const styles = getStyleSheet(theme);

    // Track if this is the first load
    const initialLoadDone = useRef(false);
    const [selectedBot, setSelectedBot] = useState<AiBotModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [channelId, setChannelId] = useState<string | null>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    // Auto-select first bot when bots are loaded from database
    useEffect(() => {
        if (bots.length > 0 && !selectedBot) {
            setSelectedBot(bots[0]);
        }
    }, [bots, selectedBot]);

    // Refresh bots from network on mount
    useEffect(() => {
        const refreshBots = async () => {
            // If we have cached data, don't show loading spinner
            if (bots.length > 0) {
                initialLoadDone.current = true;
                setLoading(false);
            }

            const {error: fetchError} = await fetchAIBots(serverUrl);

            // Mark initial load as done
            if (!initialLoadDone.current) {
                initialLoadDone.current = true;
                setLoading(false);
            }

            // Only show error if fetch failed AND we have no cached data
            if (fetchError && bots.length === 0) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_loading_bots',
                    defaultMessage: 'Failed to load agents. Please try again.',
                }));
            }
        };

        refreshBots();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

    // Show error if no bots after loading
    useEffect(() => {
        if (!loading && bots.length === 0 && !error) {
            setError(intl.formatMessage({
                id: 'agents.chat.no_bots',
                defaultMessage: 'No agents available.',
            }));
        } else if (bots.length > 0 && error) {
            // Clear error if we now have bots
            setError(null);
        }
    }, [loading, bots.length, error, intl]);

    // Get or create DM channel when bot is selected
    useEffect(() => {
        const getChannel = async () => {
            if (!selectedBot) {
                setChannelId(null);
                return;
            }

            const {data, error: channelError} = await createDirectChannel(
                serverUrl,
                selectedBot.id,
            );

            if (channelError || !data) {
                setError(intl.formatMessage({
                    id: 'agents.chat.error_creating_channel',
                    defaultMessage: 'Failed to start conversation. Please try again.',
                }));
                return;
            }

            setChannelId(data.id);
        };

        getChannel();
    }, [selectedBot, serverUrl, intl]);

    const exit = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, exit);

    const handleHistoryPress = useCallback(() => {
        goToAgentThreadsList(intl);
    }, [intl]);

    const handleBotSelect = useCallback((bot: AiBotModel) => {
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
                            <BotSelectorItem
                                key={bot.id}
                                bot={bot}
                                avatarUrl={avatarUrl}
                                isSelected={selectedBot?.id === bot.id}
                                onSelect={handleBotSelect}
                                theme={theme}
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

    // Show loading only on first load with no cached data
    if (loading && bots.length === 0) {
        return (
            <View style={[styles.container, {paddingTop: insets.top}]}>
                <Loading
                    containerStyle={styles.loadingContainer}
                    size='large'
                    color={theme.buttonBg}
                />
            </View>
        );
    }

    return (
        <View
            style={styles.container}
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
            <View
                style={styles.mainContent}
                onLayout={onLayout}
            >
                <View style={styles.content}>
                    <View style={styles.introContent}>
                        <AgentsIntro theme={theme}/>
                        <Text style={styles.welcomeText}>
                            {intl.formatMessage({
                                id: 'agents.chat.intro_title',
                                defaultMessage: 'Ask Agents anything',
                            })}
                        </Text>
                        <Text style={styles.descriptionText}>
                            {intl.formatMessage({
                                id: 'agents.chat.intro_description',
                                defaultMessage: 'Agents are here to help.',
                            })}
                        </Text>
                        {error && <Text style={styles.errorText}>{error}</Text>}
                    </View>
                </View>

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
