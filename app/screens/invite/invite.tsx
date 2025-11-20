// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState, useRef} from 'react';
import {type IntlShape, useIntl} from 'react-intl';
import {Keyboard, View, type LayoutChangeEvent} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {searchProfiles} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useKeyboardOverlap} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {dismissModal, setButtons} from '@screens/navigation';
import {isEmail} from '@utils/helpers';
import {mergeNavigationOptions} from '@utils/navigation';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';

import {sendGuestInvites, sendMembersInvites} from './actions';
import Selection from './selection';
import Summary from './summary';

import type {EmailInvite, Result, SearchResult, SendOptions} from './types';
import type {AvailableScreens, NavButtons} from '@typings/screens/navigation';
import type {OptionsTopBarButton} from 'react-native-navigation';

const CLOSE_BUTTON_ID = 'close-invite';
const SEND_BUTTON_ID = 'send-invite';
const TIMEOUT_MILLISECONDS = 200;
const DEFAULT_RESULT = {sent: [], notSent: []};

const makeLeftButton = (theme: Theme): OptionsTopBarButton => ({
    id: CLOSE_BUTTON_ID,
    icon: CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor),
    testID: 'invite.close.button',
});

const makeRightButton = (theme: Theme, formatMessage: IntlShape['formatMessage'], enabled: boolean): OptionsTopBarButton => ({
    id: SEND_BUTTON_ID,
    text: formatMessage({id: 'invite.send_invite', defaultMessage: 'Send'}),
    showAsAction: 'always',
    testID: 'invite.send.button',
    color: theme.sidebarHeaderTextColor,
    disabledColor: changeOpacity(theme.sidebarHeaderTextColor, 0.4),
    enabled,
});

const closeModal = async () => {
    Keyboard.dismiss();
    await dismissModal();
};

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        container: {
            flex: 1,
            flexDirection: 'column',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    };
});

enum Stage {
    SELECTION = 'selection',
    RESULT = 'result',
    LOADING = 'loading',
}

type InviteProps = {
    componentId: AvailableScreens;
    teamId: string;
    teamDisplayName: string;
    teamLastIconUpdate: number;
    teamInviteId: string;
    teammateNameDisplay: string;
    isAdmin: boolean;
    emailInvitationsEnabled: boolean;
    canInviteGuests: boolean;
}

export default function Invite({
    componentId,
    teamId,
    teamDisplayName,
    teamLastIconUpdate,
    teamInviteId,
    teammateNameDisplay,
    isAdmin,
    emailInvitationsEnabled,
    canInviteGuests,
}: InviteProps) {
    const intl = useIntl();
    const {formatMessage} = intl;
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const mainView = useRef<View>(null);
    const [wrapperHeight, setWrapperHeight] = useState(0);
    const keyboardOverlap = useKeyboardOverlap(mainView, wrapperHeight);

    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const retryTimeoutId = useRef<NodeJS.Timeout | null>(null);

    const [term, setTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selectedIds, setSelectedIds] = useState<{[id: string]: SearchResult}>({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Result>(DEFAULT_RESULT);
    const [stage, setStage] = useState(Stage.SELECTION);
    const [sendError, setSendError] = useState('');

    const [sendOptions, setSendOptions] = useState<SendOptions>({
        inviteAsGuest: false,
        includeCustomMessage: false,
        customMessage: '',
        selectedChannels: [],
    });

    const isResult = stage === Stage.RESULT;
    const isSelecting = stage === Stage.SELECTION;

    const selectedCount = Object.keys(selectedIds).length;
    const hasSelection = selectedCount > 0;

    const onLayoutWrapper = useCallback((e: LayoutChangeEvent) => {
        setWrapperHeight(e.nativeEvent.layout.height);
    }, []);

    const handleClearSearch = useCallback(() => {
        setTerm('');
        setSearchResults([]);
    }, []);

    const searchUsers = useCallback(async (searchTerm: string) => {
        if (searchTerm === '') {
            handleClearSearch();
            return;
        }

        const {data} = await searchProfiles(serverUrl, searchTerm.toLowerCase(), {});
        const results: SearchResult[] = data ?? [];

        if (!results.length && isEmail(searchTerm.trim()) && emailInvitationsEnabled) {
            results.push(searchTerm.trim() as EmailInvite);
        }

        setSearchResults(results);
    }, [emailInvitationsEnabled, handleClearSearch, serverUrl]);

    const handleReset = useCallback(() => {
        setSendError('');
        setTerm('');
        setSearchResults([]);
        setResult(DEFAULT_RESULT);
        setStage(Stage.SELECTION);
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

        if (!secureGetFromRecord(selectedIds, id)) {
            newSelectedIds[id] = item;
        }

        setSelectedIds(newSelectedIds);

        handleClearSearch();
    }, [selectedIds, handleClearSearch]);

    const handleSendError = useCallback(() => {
        setSendError(formatMessage({id: 'invite.send_error', defaultMessage: 'Something went wrong while trying to send invitations. Please check your network connection and try again.'}));
        setResult(DEFAULT_RESULT);
        setStage(Stage.RESULT);
    }, [formatMessage]);

    const handleSend = useCallback(async () => {
        if (!hasSelection) {
            return;
        }

        setStage(Stage.LOADING);

        if (sendOptions.inviteAsGuest) {
            const {sent, notSent} = await sendGuestInvites(serverUrl, teamId, selectedIds, sendOptions, formatMessage);
            setResult({sent, notSent});
            setStage(Stage.RESULT);
            return;
        }

        const {sent, notSent, error} = await sendMembersInvites(serverUrl, teamId, selectedIds, isAdmin, teamDisplayName, formatMessage);
        if (error) {
            handleSendError();
        } else {
            setResult({sent, notSent});
            setStage(Stage.RESULT);
        }
    }, [formatMessage, handleSendError, isAdmin, hasSelection, selectedIds, sendOptions, serverUrl, teamDisplayName, teamId]);

    const handleRetry = useCallback(() => {
        setSendError('');
        setStage(Stage.LOADING);

        retryTimeoutId.current = setTimeout(() => {
            handleSend();
        }, TIMEOUT_MILLISECONDS);
    }, [handleSend]);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, closeModal, [closeModal]);
    useNavButtonPressed(SEND_BUTTON_ID, componentId, handleSend, [handleSend]);

    useEffect(() => {
        const buttons: NavButtons = {
            leftButtons: [makeLeftButton(theme)],
            rightButtons: isSelecting ? [makeRightButton(theme, formatMessage, hasSelection)] : [],
        };

        setButtons(componentId, buttons);
    }, [theme, componentId, hasSelection, isSelecting, formatMessage]);

    useEffect(() => {
        mergeNavigationOptions(componentId, {
            topBar: {
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: isResult ? (
                        formatMessage({id: 'invite.title.summary', defaultMessage: 'Invite summary'})
                    ) : (
                        formatMessage({id: 'invite.title', defaultMessage: 'Invite'})
                    ),
                },
            },
        });
    }, [componentId, formatMessage, isResult, theme]);

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
    }, [selectedIds]);

    useAndroidHardwareBackHandler(componentId, closeModal);

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
                        testID='invite.screen.summary'
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
                        keyboardOverlap={keyboardOverlap}
                        wrapperHeight={wrapperHeight}
                        loading={loading}
                        onSearchChange={handleSearchChange}
                        onSelectItem={handleSelectItem}
                        onRemoveItem={handleRemoveItem}
                        onClose={closeModal}
                        testID='invite.screen.selection'
                        sendOptions={sendOptions}
                        onSendOptionsChange={setSendOptions}
                        canInviteGuests={canInviteGuests}
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
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            {renderContent()}
        </SafeAreaView>
    );
}
