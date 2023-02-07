// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState, useRef, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, View, LayoutChangeEvent, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useModalPosition} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, setButtons} from '@screens/navigation';
import {isEmail} from '@utils/helpers';
import {mergeNavigationOptions} from '@utils/navigation';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import {sendMembersInvites, sendGuestsInvites} from './invite_actions';
import Selection from './selection';
import SelectionChannels from './selection_channels';
import Summary from './summary';

import type {EmailInvite, SearchResult, Invites, Result} from './invite_types';
import type {AvailableScreens, NavButtons} from '@typings/screens/navigation';
import type {OptionsTopBarButton} from 'react-native-navigation';

const CLOSE_BUTTON_ID = 'close-invite';
const BACK_BUTTON_ID = 'back-invite';
const TIMEOUT_MILLISECONDS = 200;
const DEFAULT_RESULT = {sent: [], notSent: []};

const makeLeftButton = (theme: Theme, isBack: boolean): OptionsTopBarButton => (isBack ? {
    id: BACK_BUTTON_ID,
    icon: CompassIcon.getImageSourceSync(
        Platform.select({default: 'arrow-left', ios: 'arrow-back-ios'}),
        24,
        theme.sidebarHeaderTextColor,
    ),
    testID: 'invite.back.button',
} : {
    id: CLOSE_BUTTON_ID,
    icon: CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor),
    testID: 'invite.close.button',
});

const closeModal = async () => {
    Keyboard.dismiss();
    await dismissModal();
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'column',
        },
        contentContainer: {
            display: 'flex',
            flex: 1,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        footer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            borderTopWidth: 0,
            padding: 20,
            backgroundColor: theme.centerChannelBg,
        },
        footerWithBorder: {
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        footerButtonContainer: {
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
        },
    };
});

enum Stage {
    SELECTION = 'selection',
    SELECT_CHANNELS = 'select_channels',
    RESULT = 'result',
    LOADING = 'loading',
}

enum InviteType {
    MEMBER = 'member',
    GUEST = 'guest',
}

type InviteProps = {
    componentId: AvailableScreens;
    teamId: string;
    teamDisplayName: string;
    teamLastIconUpdate: number;
    teamInviteId: string;
    teammateNameDisplay: string;
    isAdmin: boolean;
}

export default function Invite({
    componentId,
    teamId,
    teamDisplayName,
    teamLastIconUpdate,
    teamInviteId,
    teammateNameDisplay,
    isAdmin,
}: InviteProps) {
    const intl = useIntl();
    const {formatMessage, locale} = intl;
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const mainView = useRef<View>(null);
    const modalPosition = useModalPosition(mainView);

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const retryTimeoutId = useRef<NodeJS.Timeout | null>(null);

    const [term, setTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedIds, setSelectedIds] = useState<Invites>({});
    const [inviteType, setInviteType] = useState(InviteType.MEMBER);
    const [customMessage, setCustomMessage] = useState('');
    const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Result>(DEFAULT_RESULT);
    const [wrapperHeight, setWrapperHeight] = useState(0);
    const [stage, setStage] = useState(Stage.SELECTION);
    const [footerButton, setFooterButton] = useState<React.ReactNode>(null);
    const [sendError, setSendError] = useState('');

    const selectedCount = Object.keys(selectedIds).length;

    const onLayoutWrapper = useCallback((e: LayoutChangeEvent) => {
        setWrapperHeight(e.nativeEvent.layout.height);
    }, []);

    const searchUsers = useCallback(async (searchTerm: string) => {
        if (searchTerm === '') {
            handleClearSearch();
            return;
        }

        const {data} = await searchProfiles(serverUrl, searchTerm.toLowerCase(), {});
        const results: SearchResult[] = data ?? [];

        if (!results.length && isEmail(searchTerm.trim())) {
            results.push(searchTerm.trim() as EmailInvite);
        }

        setSearchResults(results);
    }, [serverUrl, teamId]);

    const handleOnGetFooterButton = useCallback((button: React.ReactNode) => {
        setFooterButton(button);
    }, []);

    const handleOnOpenSelectChannels = useCallback(() => {
        setStage(Stage.SELECT_CHANNELS);
    }, []);

    const handleOnAddChannels = useCallback((channels: Channel[]) => {
        setSelectedChannels(channels);
        setStage(Stage.SELECTION);
    }, []);

    const handleOnCustomMessageChange = useCallback((text: string) => {
        setCustomMessage(text);
    }, []);

    const handleOnGuestChange = useCallback((enabled: boolean) => {
        setInviteType(enabled ? InviteType.GUEST : InviteType.MEMBER);

        if (!enabled) {
            setSelectedChannels([]);
            setCustomMessage('');
        }
    }, []);

    const handleReset = useCallback(() => {
        setStage(Stage.LOADING);
        setSendError('');
        setTerm('');
        setSearchResults([]);
        setResult(DEFAULT_RESULT);
        setStage(Stage.SELECTION);
    }, []);

    const handleClearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    const handleSearchChange = useCallback((text: string) => {
        setLoading(true);
        setTerm(text);

        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }

        searchTimeoutId.current = setTimeout(async () => {
            await searchUsers(text);
            setLoading(false);
        }, TIMEOUT_MILLISECONDS);
    }, [searchUsers]);

    const handleSelectItem = useCallback((item: SearchResult) => {
        const email = typeof item === 'string';
        const id = email ? item : (item as UserProfile).id;
        const newSelectedIds = Object.assign({}, selectedIds);

        if (!selectedIds[id]) {
            newSelectedIds[id] = item;
        }

        setSelectedIds(newSelectedIds);

        handleClearSearch();
    }, [selectedIds, handleClearSearch]);

    const handleRetry = useCallback(() => {
        setSendError('');
        setStage(Stage.LOADING);

        retryTimeoutId.current = setTimeout(() => {
            handleSend();
        }, TIMEOUT_MILLISECONDS);
    }, []);

    const handleSendError = () => {
        setSendError(formatMessage({id: 'invite.send_error', defaultMessage: 'Something went wrong while trying to send invitations. Please check your network connection and try again.'}));
        setResult(DEFAULT_RESULT);
        setStage(Stage.RESULT);
    };

    const handleSend = async () => {
        if (!selectedCount) {
            return;
        }

        setStage(Stage.LOADING);

        const {data, error} = (inviteType === InviteType.GUEST) ? (
            await sendGuestsInvites(serverUrl, teamId, teamDisplayName, selectedIds, selectedChannels, customMessage, intl, isAdmin)
        ) : (
            await sendMembersInvites(serverUrl, teamId, teamDisplayName, selectedIds, intl, isAdmin)
        );

        if (error) {
            handleSendError();
        } else if (data) {
            setResult(data);
        }

        setStage(Stage.RESULT);
    };

    const goBack = useCallback(() => {
        setStage(Stage.SELECTION);
    }, []);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, closeModal, [closeModal]);
    useNavButtonPressed(BACK_BUTTON_ID, componentId, goBack, [goBack]);

    useEffect(() => {
        const buttons: NavButtons = {
            leftButtons: [makeLeftButton(theme, stage === Stage.SELECT_CHANNELS)],
        };

        setButtons(componentId, buttons);
    }, [theme, locale, componentId, stage === Stage.SELECT_CHANNELS]);

    useEffect(() => {
        mergeNavigationOptions(componentId, {
            topBar: {
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: stage === Stage.RESULT ? (
                        formatMessage({id: 'invite.title.summary', defaultMessage: 'Invite summary'})
                    ) : (
                        (stage === Stage.SELECT_CHANNELS && formatMessage({id: 'invite.title.select_channels', defaultMessage: 'Add to channels'})) ||
                        formatMessage({id: 'invite.title', defaultMessage: 'Invite'})
                    ),
                },
            },
        });
    }, [componentId, locale, theme, stage === Stage.RESULT, stage === Stage.SELECT_CHANNELS]);

    useEffect(() => {
        return () => {
            if (searchTimeoutId.current) {
                clearTimeout(searchTimeoutId.current);
            }

            if (retryTimeoutId.current) {
                clearTimeout(retryTimeoutId.current);
            }
        };
    }, []);

    const handleRemoveItem = useCallback((id: string) => {
        const newSelectedIds = Object.assign({}, selectedIds);

        Reflect.deleteProperty(newSelectedIds, id);

        setSelectedIds(newSelectedIds);

        if (Object.keys(newSelectedIds).length === 0) {
            handleOnGuestChange(false);
        }
    }, [selectedIds]);

    const footerStyle = useMemo(() => {
        const style = [];

        style.push(styles.footer);

        if (stage !== Stage.SELECT_CHANNELS) {
            style.push(styles.footerWithBorder);
        }

        return style;
    }, [stage !== Stage.SELECT_CHANNELS]);

    const renderContent = () => {
        switch (stage) {
            case Stage.LOADING:
                return (
                    <Loading
                        containerStyle={styles.loadingContainer}
                        size='large'
                        color={theme.centerChannelColor}
                    />
                );
            case Stage.RESULT:
                return (
                    <Summary
                        result={result}
                        selectedIds={selectedIds}
                        error={sendError}
                        onClose={closeModal}
                        onRetry={handleRetry}
                        onBack={handleReset}
                        onGetFooterButton={handleOnGetFooterButton}
                        testID='invite.screen.summary'
                    />
                );
            case Stage.SELECT_CHANNELS:
                return (
                    <SelectionChannels
                        teamId={teamId}
                        selectedChannels={selectedChannels}
                        onAddChannels={handleOnAddChannels}
                        onGetFooterButton={handleOnGetFooterButton}
                    />
                );
            default:
                return (
                    <Selection
                        teamId={teamId}
                        teamDisplayName={teamDisplayName}
                        teamLastIconUpdate={teamLastIconUpdate}
                        teamInviteId={teamInviteId}
                        teammateNameDisplay={teammateNameDisplay}
                        serverUrl={serverUrl}
                        term={term}
                        searchResults={searchResults}
                        selectedIds={selectedIds}
                        modalPosition={modalPosition}
                        wrapperHeight={wrapperHeight}
                        loading={loading}
                        guestEnabled={inviteType === InviteType.GUEST}
                        customMessage={customMessage}
                        selectedChannelsCount={selectedChannels.length}
                        onSearchChange={handleSearchChange}
                        onSelectItem={handleSelectItem}
                        onRemoveItem={handleRemoveItem}
                        onClose={closeModal}
                        onSend={handleSend}
                        onGetFooterButton={handleOnGetFooterButton}
                        onOpenSelectChannels={handleOnOpenSelectChannels}
                        onGuestChange={handleOnGuestChange}
                        onCustomMessageChange={handleOnCustomMessageChange}
                        testID='invite.screen.selection'
                    />
                );
        }
    };

    return (
        <SafeAreaView
            style={styles.container}
            onLayout={onLayoutWrapper}
            ref={mainView}
            testID='invite.screen'
        >
            <View style={styles.contentContainer}>
                {renderContent()}
            </View>
            <View style={footerStyle}>
                <View style={styles.footerButtonContainer}>
                    {footerButton}
                </View>
            </View>
        </SafeAreaView>
    );
}
