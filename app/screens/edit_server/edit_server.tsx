// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';

import {doPing} from '@actions/remote/general';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {getServerCredentials, removePreauthSecret, setPreauthSecret as storePreauthSecret} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServerByDisplayName} from '@queries/app/servers';
import Background from '@screens/background';
import {navigateBack} from '@screens/navigation';
import {getErrorMessage, getFullErrorMessage} from '@utils/errors';
import {logWarning} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getServerUrlAfterRedirect} from '@utils/url';

import Form from './form';
import Header from './header';

import type ServersModel from '@typings/database/models/app/servers';

type ServerProps = {
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

const EditServer = ({server, theme}: ServerProps) => {
    const intl = useIntl();
    const {formatMessage} = intl;
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState<string>(server.displayName);
    const [buttonDisabled, setButtonDisabled] = useState(Boolean(!server.displayName));
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const [preauthSecret, setPreauthSecret] = useState<string>('');
    const [initialPreauthSecret, setInitialPreauthSecret] = useState<string>('');
    const [preauthSecretError, setPreauthSecretError] = useState<string | undefined>();
    const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
    const [validating, setValidating] = useState(false);
    const styles = getStyleSheet(theme);

    const close = useCallback(() => {
        navigateBack();
    }, []);

    // Load current preauth secret from credentials
    useEffect(() => {
        const loadCredentials = async () => {
            try {
                const credentials = await getServerCredentials(server.url);
                const currentPreauthSecret = credentials?.preauthSecret || '';
                setPreauthSecret(currentPreauthSecret);
                setInitialPreauthSecret(currentPreauthSecret);

                // Auto-open advanced options if preauth secret exists
                if (currentPreauthSecret) {
                    setShowAdvancedOptions(true);
                }
            } catch (error) {
                // Credentials not found or error loading, keep empty
            }
        };

        loadCredentials();
    }, [server.url]);

    useEffect(() => {
        setButtonDisabled(Boolean(!displayName));
    }, [displayName]);

    // Candidate secret must be applied to the live client before ping: the cached session would
    // otherwise keep answering with the previous secret. Concurrent traffic may briefly use the
    // candidate; handleUpdate rolls it back when validation fails.
    const applyPreauthSecretHeader = useCallback(async (secret: string) => {
        try {
            await NetworkManager.getClient(server.url).setPreauthSecretHeader(secret);
        } catch {
            // No client cached for this server yet; nothing to update.
        }
    }, [server.url]);

    const validateServer = useCallback(async (): Promise<boolean> => {
        setValidating(true);

        try {
            const trimmedSecret = preauthSecret.trim();
            const secretForValidation = trimmedSecret || undefined;

            const headRequest = await getServerUrlAfterRedirect(server.url, true, secretForValidation);
            if (!headRequest.url) {
                setPreauthSecretError(getErrorMessage(headRequest.error, intl));
                setShowAdvancedOptions(true);
                return false;
            }

            // Passing the live client also stops doPing invalidating a session that is still in use.
            await applyPreauthSecretHeader(trimmedSecret);
            let pingClient;
            try {
                pingClient = NetworkManager.getClient(server.url);
            } catch {
                pingClient = undefined;
            }

            const result = await doPing(
                headRequest.url, // serverUrl
                true, // verifyPushProxy
                undefined, // timeoutInterval
                secretForValidation, // preauthSecret
                pingClient, // client
            );
            if (result.error) {
                if (result.isPreauthError) {
                    setPreauthSecretError(formatMessage({
                        id: 'mobile.server.preauth_secret.invalid',
                        defaultMessage: 'Authentication secret is invalid. Try again or contact your admin.',
                    }));
                    setShowAdvancedOptions(true);
                } else {
                    setPreauthSecretError(getErrorMessage(result.error, intl));
                    setShowAdvancedOptions(true);
                }
                return false;
            }

            return true;
        } catch (error) {
            // Handle any unexpected errors during validation
            setPreauthSecretError(formatMessage({
                id: 'mobile.server.validation.error',
                defaultMessage: 'Unable to validate server. Please check your connection and try again.',
            }));
            setShowAdvancedOptions(true);
            return false;
        } finally {
            setValidating(false);
        }
    }, [server.url, preauthSecret, applyPreauthSecretHeader, formatMessage, intl]);

    const handleUpdate = useCallback(async () => {
        if (buttonDisabled) {
            return;
        }

        if (displayNameError) {
            setDisplayNameError(undefined);
        }

        if (preauthSecretError) {
            setPreauthSecretError(undefined);
        }

        setSaving(true);

        // Check display name uniqueness
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

        // Only validate server connection if preauth secret has changed
        const preauthSecretChanged = preauthSecret.trim() !== initialPreauthSecret.trim();
        if (preauthSecretChanged) {
            const isValidServer = await validateServer();
            if (!isValidServer) {
                // Validation put the candidate secret on the live client, so put the stored one back.
                await applyPreauthSecretHeader(initialPreauthSecret.trim());
                setSaving(false);
                return;
            }
        }

        // Save display name
        await DatabaseManager.updateServerDisplayName(server.url, displayName);

        if (preauthSecretChanged) {
            const trimmedSecret = preauthSecret.trim();
            if (trimmedSecret) {
                const stored = await storePreauthSecret(server.url, trimmedSecret);
                if (!stored) {
                    await applyPreauthSecretHeader(initialPreauthSecret.trim());
                    setPreauthSecretError(formatMessage({
                        id: 'mobile.server.preauth_secret.save_failed',
                        defaultMessage: 'Unable to save authentication secret. Please try again.',
                    }));
                    setShowAdvancedOptions(true);
                    setSaving(false);
                    return;
                }
            } else {
                await removePreauthSecret(server.url);
            }

            const credentials = await getServerCredentials(server.url);

            // validateServer already applied this to the live client; this covers the case where
            // no client existed then, and is a no-op otherwise.
            try {
                NetworkManager.getClient(server.url);
                await applyPreauthSecretHeader(trimmedSecret);
            } catch {
                await NetworkManager.createClient(server.url, credentials?.token, trimmedSecret || undefined);
            }

            try {
                // WebsocketManager.initializeClient reuses the existing client and never re-reads
                // the keychain, so the client has to be rebuilt for the new secret to be used.
                if (credentials?.token) {
                    await WebsocketManager.createClient(server.url, credentials.token, trimmedSecret || undefined);
                    await WebsocketManager.initializeClient(server.url);
                }
            } catch (error) {
                logWarning('EditServer.handleUpdate: could not rebuild the WebSocket client', getFullErrorMessage(error));
            }
        }

        navigateBack();
    }, [buttonDisabled, displayName, displayNameError, preauthSecretError, server.url, preauthSecret, initialPreauthSecret, applyPreauthSecretHeader, formatMessage, validateServer]);

    const handleDisplayNameTextChanged = useCallback((text: string) => {
        setDisplayName(text);
        setDisplayNameError(undefined);
    }, []);

    const handlePreauthSecretTextChanged = useCallback((text: string) => {
        setPreauthSecret(text);
        setPreauthSecretError(undefined);
    }, []);

    useAndroidHardwareBackHandler(Screens.EDIT_SERVER, close);

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <SafeAreaView
                key={'server_content'}
                style={styles.flex}
                testID='edit_server.screen'
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={styles.scrollContainer}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                    mode='layout'
                >
                    <Header theme={theme}/>
                    <Form
                        buttonDisabled={buttonDisabled}
                        connecting={saving || validating}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        handleUpdate={handleUpdate}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        handlePreauthSecretTextChanged={handlePreauthSecretTextChanged}
                        preauthSecret={preauthSecret}
                        preauthSecretError={preauthSecretError}
                        serverUrl={server.url}
                        setShowAdvancedOptions={setShowAdvancedOptions}
                        showAdvancedOptions={showAdvancedOptions}
                        theme={theme}
                    />
                </KeyboardAwareScrollView>
            </SafeAreaView>
        </View>
    );
};

export default EditServer;
