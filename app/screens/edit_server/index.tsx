// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import {doPing} from '@actions/remote/general';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {getServerCredentials, setServerCredentials} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import {getServerByDisplayName} from '@queries/app/servers';
import Background from '@screens/background';
import {dismissModal} from '@screens/navigation';
import {getErrorMessage} from '@utils/errors';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getServerUrlAfterRedirect} from '@utils/url';

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
    const intl = useIntl();
    const {formatMessage} = intl;
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const [saving, setSaving] = useState(false);
    const [displayName, setDisplayName] = useState<string>(server.displayName);
    const [buttonDisabled, setButtonDisabled] = useState(Boolean(!server.displayName));
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const [preauthSecret, setPreauthSecret] = useState<string>('');
    const [preauthSecretError, setPreauthSecretError] = useState<string | undefined>();
    const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
    const [validating, setValidating] = useState(false);
    const styles = getStyleSheet(theme);

    const close = useCallback(() => {
        dismissModal({componentId});
    }, [componentId]);

    // Load current preauth secret from credentials
    useEffect(() => {
        const loadCredentials = async () => {
            try {
                const credentials = await getServerCredentials(server.url);
                const currentPreauthSecret = credentials?.preauthSecret || '';
                setPreauthSecret(currentPreauthSecret);

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

    // Validate server connection with preauth secret
    const validateServer = useCallback(async (): Promise<boolean> => {
        // Only validate if preauth secret has changed
        setValidating(true);

        try {
            const trimmedSecret = preauthSecret.trim();

            // Test with the actual preauth secret value (or undefined if empty)
            const secretForValidation = trimmedSecret || undefined;

            // First try HEAD request
            const headRequest = await getServerUrlAfterRedirect(server.url, true, secretForValidation);
            if (!headRequest.url) {
                setPreauthSecretError(getErrorMessage(headRequest.error, intl));
                setShowAdvancedOptions(true);
                return false;
            }

            // Then try ping request - use doPing without client to avoid client pollution
            const result = await doPing(headRequest.url, true, undefined, secretForValidation);
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
    }, [server.url, preauthSecret, formatMessage, intl]);

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

        // Validate preauth secret if changed
        const isValidServer = await validateServer();
        if (!isValidServer) {
            setSaving(false);
            return;
        }

        // Save display name
        await DatabaseManager.updateServerDisplayName(server.url, displayName);

        // Save preauth secret to credentials (or remove if empty)
        const credentials = await getServerCredentials(server.url);
        setServerCredentials(server.url, credentials?.token || '', preauthSecret.trim() || undefined);

        // Create and cache new client if preauth secret changed
        try {
            await NetworkManager.createClient(server.url, credentials?.token, preauthSecret.trim() || undefined);
        } catch (error) {
            // Client creation failed, but credentials are saved - continue with modal dismissal
        }

        dismissModal({componentId});
    }, [buttonDisabled, displayName, displayNameError, preauthSecretError, server.url, preauthSecret, formatMessage, validateServer, componentId]);

    const handleDisplayNameTextChanged = useCallback((text: string) => {
        setDisplayName(text);
        setDisplayNameError(undefined);
    }, []);

    const handlePreauthSecretTextChanged = useCallback((text: string) => {
        setPreauthSecret(text);
        setPreauthSecretError(undefined);
    }, []);

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
                        connecting={saving || validating}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        handleUpdate={handleUpdate}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        handlePreauthSecretTextChanged={handlePreauthSecretTextChanged}
                        keyboardAwareRef={keyboardAwareRef}
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
