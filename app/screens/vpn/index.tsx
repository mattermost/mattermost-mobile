// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {errorCodes, isErrorWithCode, pick, types} from '@react-native-documents/picker';
import {router} from 'expo-router';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Alert, Text, TextInput, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {SafeAreaView} from 'react-native-safe-area-context';

import Button from '@components/button';
import {useThemeByAppearanceWithDefault} from '@context/theme';
import {
    WireGuardStatus,
    addWireGuardStateListener,
    clearWireGuardConfig,
    connectWireGuard,
    disconnectWireGuard,
    getWireGuardState,
    loadWireGuardConfig,
    readWireGuardConfig,
    saveWireGuardConfig,
    setWireGuardSecureScreen,
    validateWireGuardConfig,
    type WireGuardConfigSummary,
    type WireGuardState,
} from '@managers/wireguard_manager';
import {changeOpacity} from '@utils/theme';

import getStyleSheet from './styles';

const initialState: WireGuardState = {
    status: WireGuardStatus.Disconnected,
    message: null,
    handshakeEpochMillis: 0,
    rxBytes: 0,
    txBytes: 0,
    applicationId: '',
};

const statusMessages = defineMessages({
    [WireGuardStatus.Disconnected]: {
        id: 'mobile.vpn.status.disconnected',
        defaultMessage: 'Disconnected',
    },
    [WireGuardStatus.Connecting]: {
        id: 'mobile.vpn.status.connecting',
        defaultMessage: 'Connecting',
    },
    [WireGuardStatus.Connected]: {
        id: 'mobile.vpn.status.connected',
        defaultMessage: 'Connected',
    },
    [WireGuardStatus.Failed]: {
        id: 'mobile.vpn.status.failed',
        defaultMessage: 'Connection failed',
    },
});

type SummaryRowProps = {
    label: string;
    value: string;
};

function SummaryRow({label, value}: SummaryRowProps) {
    const theme = useThemeByAppearanceWithDefault();
    const styles = getStyleSheet(theme);
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue}>{value}</Text>
        </View>
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return 'The WireGuard connection could not be established.';
}

type VpnScreenProps = {
    management?: boolean;
};

export default function VpnScreen({management = false}: VpnScreenProps) {
    const intl = useIntl();
    const theme = useThemeByAppearanceWithDefault();
    const styles = getStyleSheet(theme);
    const [state, setState] = useState<WireGuardState>(initialState);
    const [config, setConfig] = useState('');
    const [summary, setSummary] = useState<WireGuardConfigSummary>();
    const [editing, setEditing] = useState(false);
    const [hasSavedConfig, setHasSavedConfig] = useState(false);
    const [localError, setLocalError] = useState<string>();
    const [importing, setImporting] = useState(false);
    const autoConnectAttempted = useRef(false);
    const connectingRef = useRef(false);

    const connecting = state.status === WireGuardStatus.Connecting;
    const connected = state.status === WireGuardStatus.Connected;
    const controlsDisabled = connecting || importing;
    const visibleError = localError ?? state.message;

    const statusLabel = intl.formatMessage(statusMessages[state.status]);
    let statusColor = theme.centerChannelColor;
    if (connected) {
        statusColor = theme.onlineIndicator;
    } else if (state.status === WireGuardStatus.Failed) {
        statusColor = theme.errorTextColor;
    }
    let statusDetail = intl.formatMessage({
        id: 'mobile.vpn.per_app',
        defaultMessage: 'Only this application is included in the tunnel. Other applications keep their normal network connection.',
    });
    if (connected && state.handshakeEpochMillis > 0) {
        statusDetail = intl.formatMessage({
            id: 'mobile.vpn.verified',
            defaultMessage: 'WireGuard handshake verified. Received {rxBytes} bytes and sent {txBytes} bytes through the tunnel.',
        }, {rxBytes: state.rxBytes, txBytes: state.txBytes});
    }

    const connectConfig = useCallback(async (value: string) => {
        if (connectingRef.current) {
            return;
        }
        if (!value.trim()) {
            setLocalError(intl.formatMessage({
                id: 'mobile.vpn.error.empty',
                defaultMessage: 'Import or paste a WireGuard configuration before connecting.',
            }));
            setEditing(true);
            return;
        }

        connectingRef.current = true;
        setLocalError(undefined);
        setState((previous) => ({...previous, status: WireGuardStatus.Connecting, message: null}));
        try {
            const validatedSummary = await validateWireGuardConfig(value);
            setSummary(validatedSummary);
            const connectedState = await connectWireGuard(value);
            try {
                await saveWireGuardConfig(value);
            } catch {
                await disconnectWireGuard();
                throw new Error('The tunnel connected, but the configuration could not be saved securely. The tunnel was disconnected.');
            }
            setConfig(value);
            setHasSavedConfig(true);
            setEditing(false);
            setState(connectedState);
            if (!management) {
                router.replace('/');
            }
        } catch (error) {
            const message = getErrorMessage(error);
            setLocalError(message);
            setState((previous) => ({
                ...previous,
                status: WireGuardStatus.Failed,
                message,
                handshakeEpochMillis: 0,
                rxBytes: 0,
                txBytes: 0,
            }));
        } finally {
            connectingRef.current = false;
        }
    }, [intl, management]);

    useEffect(() => {
        let active = true;
        setWireGuardSecureScreen(true);
        const removeListener = addWireGuardStateListener((newState) => {
            if (active) {
                setState(newState);
            }
        });

        async function initialize() {
            try {
                const [storedConfig, currentState] = await Promise.all([
                    loadWireGuardConfig(),
                    getWireGuardState(),
                ]);
                if (!active) {
                    return;
                }

                setState(currentState);
                if (storedConfig) {
                    setConfig(storedConfig);
                    setHasSavedConfig(true);
                    setSummary(await validateWireGuardConfig(storedConfig));
                }
                if (!active) {
                    return;
                }

                if (currentState.status === WireGuardStatus.Connected) {
                    if (!management) {
                        router.replace('/');
                    }
                    return;
                }
                if (storedConfig && currentState.status === WireGuardStatus.Disconnected && !autoConnectAttempted.current) {
                    autoConnectAttempted.current = true;
                    await connectConfig(storedConfig);
                } else if (!storedConfig) {
                    setEditing(true);
                }
            } catch (error) {
                if (active) {
                    setLocalError(getErrorMessage(error));
                    setEditing(true);
                }
            }
        }

        initialize();
        return () => {
            active = false;
            removeListener();
            setWireGuardSecureScreen(false);
        };
    }, [connectConfig, management]);

    const handleImport = useCallback(async () => {
        setImporting(true);
        setLocalError(undefined);
        try {
            const [selected] = await pick({allowMultiSelection: false, type: [types.allFiles]});
            if (!selected) {
                return;
            }
            const importedConfig = await readWireGuardConfig(selected.uri);
            const importedSummary = await validateWireGuardConfig(importedConfig);
            setConfig(importedConfig);
            setSummary(importedSummary);
            setEditing(false);
            setState((previous) => ({...previous, status: WireGuardStatus.Disconnected, message: null}));
        } catch (error) {
            if (!isErrorWithCode(error) || error.code !== errorCodes.OPERATION_CANCELED) {
                setLocalError(getErrorMessage(error));
            }
        } finally {
            setImporting(false);
        }
    }, []);

    const handleDoneEditing = useCallback(async () => {
        setLocalError(undefined);
        try {
            const validatedSummary = await validateWireGuardConfig(config);
            setSummary(validatedSummary);
            setEditing(false);
        } catch (error) {
            setLocalError(getErrorMessage(error));
        }
    }, [config]);

    const handleDisconnect = useCallback(async () => {
        setLocalError(undefined);
        try {
            const disconnectedState = await disconnectWireGuard();
            setState(disconnectedState);
        } catch (error) {
            setLocalError(getErrorMessage(error));
        }
    }, []);

    const handleReplace = useCallback(async () => {
        if (connected) {
            await handleDisconnect();
        }
        setEditing(true);
        setLocalError(undefined);
    }, [connected, handleDisconnect]);

    const handleRemove = useCallback(() => {
        Alert.alert(
            intl.formatMessage({id: 'mobile.vpn.remove.title', defaultMessage: 'Remove saved configuration?'}),
            intl.formatMessage({
                id: 'mobile.vpn.remove.message',
                defaultMessage: 'This disconnects the tunnel and removes the securely saved WireGuard configuration from this device.',
            }),
            [
                {text: intl.formatMessage({id: 'mobile.vpn.cancel', defaultMessage: 'Cancel'}), style: 'cancel'},
                {
                    text: intl.formatMessage({id: 'mobile.vpn.remove.confirm', defaultMessage: 'Remove'}),
                    style: 'destructive',
                    onPress: () => {
                        async function remove() {
                            try {
                                if (connected) {
                                    await disconnectWireGuard();
                                }
                                await clearWireGuardConfig();
                                setConfig('');
                                setSummary(undefined);
                                setHasSavedConfig(false);
                                setState(initialState);
                                setLocalError(undefined);
                                setEditing(true);
                            } catch (error) {
                                setLocalError(getErrorMessage(error));
                            }
                        }
                        remove();
                    },
                },
            ],
        );
    }, [connected, intl]);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAwareScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps='handled'
                testID='mobile.vpn.screen'
            >
                <Text style={styles.title}>
                    {intl.formatMessage({id: 'mobile.vpn.title', defaultMessage: 'VPN connection'})}
                </Text>
                <Text style={styles.description}>
                    {intl.formatMessage({
                        id: 'mobile.vpn.description',
                        defaultMessage: 'Connect this app to its private network before continuing to the server and login screens.',
                    })}
                </Text>

                <View style={styles.statusCard}>
                    <Text
                        accessibilityLiveRegion='polite'
                        style={[styles.statusLabel, {color: statusColor}]}
                        testID='mobile.vpn.status'
                    >
                        {statusLabel}
                    </Text>
                    <Text style={styles.statusDetail}>{statusDetail}</Text>
                </View>

                {visibleError && <Text style={styles.errorText}>{visibleError}</Text>}

                {editing && (
                    <>
                        <Text style={styles.sectionTitle}>
                            {intl.formatMessage({id: 'mobile.vpn.editor.title', defaultMessage: 'WireGuard configuration'})}
                        </Text>
                        <TextInput
                            accessibilityLabel={intl.formatMessage({id: 'mobile.vpn.editor.label', defaultMessage: 'WireGuard configuration'})}
                            autoCapitalize='none'
                            autoCorrect={false}
                            editable={!controlsDisabled}
                            multiline={true}
                            onChangeText={(value) => {
                                setConfig(value);
                                setLocalError(undefined);
                            }}
                            placeholder={intl.formatMessage({
                                id: 'mobile.vpn.editor.placeholder',
                                defaultMessage: 'Paste the contents of a WireGuard .conf file',
                            })}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.40)}
                            style={styles.editor}
                            testID='mobile.vpn.editor'
                            value={config}
                        />
                        <Text style={styles.helpText}>
                            {intl.formatMessage({
                                id: 'mobile.vpn.editor.help',
                                defaultMessage: 'Required: [Interface] PrivateKey and Address, and [Peer] PublicKey, Endpoint, and AllowedIPs. DNS, PersistentKeepalive, PresharedKey, MTU, and multiple peers are supported.',
                            })}
                        </Text>
                    </>
                )}

                {!editing && summary && (
                    <>
                        <Text style={styles.sectionTitle}>
                            {intl.formatMessage({id: 'mobile.vpn.summary.title', defaultMessage: 'Configuration summary'})}
                        </Text>
                        <SummaryRow
                            label={intl.formatMessage({id: 'mobile.vpn.summary.addresses', defaultMessage: 'Interface addresses'})}
                            value={summary.addresses.join(', ')}
                        />
                        <SummaryRow
                            label={intl.formatMessage({id: 'mobile.vpn.summary.endpoints', defaultMessage: 'Endpoints'})}
                            value={summary.endpoints.join(', ')}
                        />
                        <SummaryRow
                            label={intl.formatMessage({id: 'mobile.vpn.summary.allowed_ips', defaultMessage: 'Allowed IP ranges'})}
                            value={summary.allowedIps.join(', ')}
                        />
                        {summary.dnsServers.length > 0 && (
                            <SummaryRow
                                label={intl.formatMessage({id: 'mobile.vpn.summary.dns', defaultMessage: 'DNS servers'})}
                                value={summary.dnsServers.join(', ')}
                            />
                        )}
                        <SummaryRow
                            label={intl.formatMessage({id: 'mobile.vpn.summary.peers', defaultMessage: 'Peers'})}
                            value={String(summary.peerCount)}
                        />
                    </>
                )}

                {!connected && (
                    <>
                        <Button
                            buttonContainerStyle={styles.button}
                            disabled={controlsDisabled}
                            onPress={() => connectConfig(config)}
                            showLoader={connecting}
                            testID='mobile.vpn.connect'
                            text={intl.formatMessage({id: 'mobile.vpn.connect', defaultMessage: 'Connect and verify'})}
                            theme={theme}
                        />
                        <Button
                            buttonContainerStyle={styles.button}
                            disabled={controlsDisabled}
                            isInverted={true}
                            onPress={handleImport}
                            showLoader={importing}
                            testID='mobile.vpn.import'
                            text={intl.formatMessage({id: 'mobile.vpn.import', defaultMessage: 'Import .conf file'})}
                            theme={theme}
                        />
                        {editing && (
                            <Button
                                buttonContainerStyle={styles.button}
                                disabled={controlsDisabled}
                                isInverted={true}
                                onPress={handleDoneEditing}
                                testID='mobile.vpn.done_editing'
                                text={intl.formatMessage({id: 'mobile.vpn.done_editing', defaultMessage: 'Validate and hide configuration'})}
                                theme={theme}
                            />
                        )}
                        {!editing && config && (
                            <Button
                                buttonContainerStyle={styles.button}
                                disabled={controlsDisabled}
                                isInverted={true}
                                onPress={() => setEditing(true)}
                                testID='mobile.vpn.edit'
                                text={intl.formatMessage({id: 'mobile.vpn.edit', defaultMessage: 'Edit configuration'})}
                                theme={theme}
                            />
                        )}
                    </>
                )}

                {connected && (
                    <>
                        {management && (
                            <Button
                                buttonContainerStyle={styles.button}
                                onPress={() => router.back()}
                                testID='mobile.vpn.done'
                                text={intl.formatMessage({id: 'mobile.vpn.done', defaultMessage: 'Done'})}
                                theme={theme}
                            />
                        )}
                        <Button
                            buttonContainerStyle={styles.button}
                            isInverted={true}
                            onPress={handleReplace}
                            testID='mobile.vpn.replace'
                            text={intl.formatMessage({id: 'mobile.vpn.replace', defaultMessage: 'Disconnect and replace configuration'})}
                            theme={theme}
                        />
                        <Button
                            buttonContainerStyle={styles.button}
                            isInverted={true}
                            onPress={handleDisconnect}
                            testID='mobile.vpn.disconnect'
                            text={intl.formatMessage({id: 'mobile.vpn.disconnect', defaultMessage: 'Disconnect'})}
                            theme={theme}
                        />
                    </>
                )}

                {hasSavedConfig && !controlsDisabled && (
                    <Button
                        buttonContainerStyle={styles.button}
                        isDestructive={true}
                        onPress={handleRemove}
                        testID='mobile.vpn.remove'
                        text={intl.formatMessage({id: 'mobile.vpn.remove', defaultMessage: 'Remove saved configuration'})}
                        theme={theme}
                    />
                )}

                <Text style={styles.footerNote}>
                    {intl.formatMessage({
                        id: 'mobile.vpn.system_disclosure',
                        defaultMessage: 'Android may display its standard VPN permission dialog, key icon, and system notification. These security indicators are left enabled.',
                    })}
                </Text>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
