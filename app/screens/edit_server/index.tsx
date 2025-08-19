// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {getServerCredentials, setServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import WebSocketManager from '@managers/websocket_manager';
import {getServerByDisplayName} from '@queries/app/servers';
import Background from '@screens/background';
import {dismissModal} from '@screens/navigation';
import {logWarning} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Form from './form';
import Header from './header';

import type ServersModel from '@typings/database/models/app/servers';
import type {AvailableScreens} from '@typings/screens/navigation';

interface ServerProps {
    closeButtonId?: string;
    componentId: AvailableScreens;
    server: ServersModel;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    flex: {
        flex: 1,
    },
    scrollContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
    },
}));

const EditServer = ({closeButtonId, componentId, server, theme}: ServerProps) => {
    const {formatMessage} = useIntl();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState<string>(server.displayName);
    const [sharedPassword, setSharedPassword] = useState<string>('');
    const [sharedPasswordModified, setSharedPasswordModified] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const styles = getStyleSheet(theme);

    const close = useCallback(() => {
        dismissModal({componentId});
    }, [componentId]);

    useEffect(() => {
        const loadCredentials = async () => {
            const credentials = await getServerCredentials(server.url);
            const hasPassword = Boolean(credentials?.sharedPassword);

            // If there's an existing password, show dummy value "keep"
            const initialValue = hasPassword ? 'keep' : '';
            setSharedPassword(initialValue);
        };
        loadCredentials();
    }, [server.url]);

    useEffect(() => {
        // Allow saving if display name is valid, regardless of changes
        setButtonDisabled(!displayName);
    }, [displayName]);

    const handleUpdate = useCallback(async () => {
        if (buttonDisabled) {
            return;
        }

        if (displayNameError) {
            setDisplayNameError(undefined);
        }

        setSaving(true);
        const knownServer = await getServerByDisplayName(displayName);
        if (knownServer && knownServer.lastActiveAt > 0 && knownServer.url !== server.url) {
            setButtonDisabled(true);
            setDisplayNameError(formatMessage({
                id: 'mobile.server_name.exists',
                defaultMessage: 'You are using this name for another server.',
            }));
            setSaving(false);
            return;
        }

        await DatabaseManager.updateServerDisplayName(server.url, displayName);

        // Update shared password only if it was modified
        if (sharedPasswordModified) {
            const credentials = await getServerCredentials(server.url);
            if (credentials) {
                // Empty field = remove password, otherwise use the new value
                const newSharedPassword = sharedPassword.trim() || undefined;
                setServerCredentials(server.url, credentials.token, newSharedPassword);

                // Update active REST client
                try {
                    const activeClient = NetworkManager.getClient(server.url);
                    activeClient.setClientCredentials(credentials.token, newSharedPassword);
                } catch (error) {
                    logWarning('Failed to update REST client shared password:', error);
                }

                // Update active WebSocket client
                try {
                    WebSocketManager.createClient(server.url, credentials.token, newSharedPassword);
                } catch (error) {
                    logWarning('Failed to update WebSocket client shared password:', error);
                }
            }
        }

        dismissModal({componentId});
    }, [!buttonDisabled && displayName, !buttonDisabled && displayNameError, !buttonDisabled && sharedPasswordModified, sharedPassword]);

    const handleDisplayNameTextChanged = useCallback((text: string) => {
        setDisplayName(text);
        setDisplayNameError(undefined);
    }, []);

    const handleSharedPasswordTextChanged = useCallback((text: string) => {
        setSharedPassword(text);
        setSharedPasswordModified(true);
    }, []);

    const handleSharedPasswordFocus = useCallback(() => {
        // Clear field when focused if it hasn't been modified yet
        if (!sharedPasswordModified) {
            setSharedPassword('');
            setSharedPasswordModified(true); // Mark as modified when clearing dummy value
        }
    }, [sharedPasswordModified]);

    useNavButtonPressed(closeButtonId || '', componentId, close, []);
    useAndroidHardwareBackHandler(componentId, close);

    return (
        <View
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <Background theme={theme}/>
            <SafeAreaView
                key={'server_content'}
                style={styles.flex}
                testID='edit_server.screen'
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={styles.scrollContainer}
                    enableAutomaticScroll={Platform.OS === 'android'}
                    enableOnAndroid={false}
                    enableResetScrollToCoords={true}
                    extraScrollHeight={20}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <Header theme={theme}/>
                    <Form
                        buttonDisabled={buttonDisabled}
                        connecting={saving}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        handleUpdate={handleUpdate}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        handleSharedPasswordTextChanged={handleSharedPasswordTextChanged}
                        handleSharedPasswordFocus={handleSharedPasswordFocus}
                        keyboardAwareRef={keyboardAwareRef}
                        serverUrl={server.url}
                        sharedPassword={sharedPassword}
                        theme={theme}
                    />
                </KeyboardAwareScrollView>
            </SafeAreaView>
        </View>
    );
};

export default EditServer;
