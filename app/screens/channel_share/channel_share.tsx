// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, ScrollView, Text, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {
    fetchChannelSharedRemotes,
    fetchRemoteClusters,
    shareChannelWithRemote,
    unshareChannelFromRemote,
} from '@actions/remote/channel';
import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import {bottomSheet, buildNavigationButton, dismissBottomSheet, popTopScreen, setButtons} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {mergeNavigationOptions} from '@utils/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import AddWorkspaceSheetContent, {getAddWorkspaceSheetContentHeight} from './add_workspace_sheet_content';
import {messages} from './messages';
import WorkspaceItem, {type SharedChannelWorkspace} from './workspace_item';

import type {AvailableScreens} from '@typings/screens/navigation';

function idUpdate(value: SharedChannelWorkspace['status'], id?: string) {
    return (w: SharedChannelWorkspace) => {
        if (id) {
            return w.remote_id === id ? {...w, status: value} : w;
        }
        return {...w, status: value};
    };
}

function notInSet(ids: Set<string>) {
    return (w: SharedChannelWorkspace) => !ids.has(w.remote_id);
}

type Props = {
    channelId: string;
    componentId: AvailableScreens;
    displayName: string;
    onSharedRemotesChanged: () => void;
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {flex: 1},
    section: {
        gap: 16,
    },
    content: {
        paddingHorizontal: 20,
        gap: 16,
    },
    sectionTitle: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    noRemotesWarning: {
        ...typography('Body', 100, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.50),
    },
    fetchError: {
        ...typography('Body', 200, 'Regular'),
        color: theme.errorTextColor,
    },
    fetchErrorTitle: {
        ...typography('Heading', 400, 'SemiBold'),
        color: theme.errorTextColor,
    },
    errorContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 8,
    },
}));

const ChannelShare = ({channelId, componentId, displayName, onSharedRemotesChanged}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const [enabled, setEnabled] = useState(false);
    const [workspaces, setWorkspaces] = useState<SharedChannelWorkspace[]>([]);
    const [toRemove, setToRemove] = useState<Set<string>>(new Set());
    const [remoteClusters, setRemoteClusters] = useState<RemoteClusterInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | undefined>();

    // We keep the state for rendering related actions while
    // using the reference as guardrail for concurrent actions.
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);

    const canSave = workspaces.some((w) => w.status !== 'saved') || toRemove.size > 0;

    const serverUrl = useServerUrl();

    useEffect(() => {
        mergeNavigationOptions(componentId, {
            topBar: {
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: displayName,
                },
            },
        });
    }, [componentId, displayName, theme.sidebarHeaderTextColor]);

    useEffect(() => {
        if (!serverUrl) {
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        Promise.all([
            fetchRemoteClusters(serverUrl),
            fetchChannelSharedRemotes(serverUrl, channelId),
        ]).then(([remotesRes, channelRemotesRes]) => {
            if (cancelled) {
                return;
            }
            setLoading(false);
            setFetchError(undefined);

            let errorMsg: string | undefined;
            if (remotesRes.error) {
                errorMsg = getFullErrorMessage(remotesRes.error);
            } else if (remotesRes.remoteClusters) {
                setRemoteClusters(remotesRes.remoteClusters);
            }

            if (channelRemotesRes.error) {
                if (errorMsg == null) {
                    errorMsg = getFullErrorMessage(channelRemotesRes.error);
                }
            } else {
                const channelRemotes = channelRemotesRes.remotes || [];
                setWorkspaces(channelRemotes.map(idUpdate('saved')));
                setEnabled(channelRemotes.length > 0);
            }
            setFetchError(errorMsg);
        }).catch((err: unknown) => {
            if (!cancelled) {
                setLoading(false);
                setFetchError(getFullErrorMessage(err));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [channelId, serverUrl]);

    useEffect(() => {
        if (workspaces.length === 0) {
            setEnabled(false);
        }
    }, [workspaces.length]);

    const onClose = useCallback(() => popTopScreen(componentId), [componentId]);

    const performSave = useCallback(async () => {
        if (savingRef.current) {
            return;
        }
        savingRef.current = true;
        setSaving(true);
        try {
            const removedIds = new Set(toRemove);
            const pending = workspaces.filter((w) => w.status === 'pending');
            for (const w of pending) {
                setWorkspaces((prev) => prev.map(idUpdate('saving', w.remote_id)));
                // eslint-disable-next-line no-await-in-loop
                const result = await shareChannelWithRemote(serverUrl, channelId, w.remote_id);
                if (result.error) {
                    setWorkspaces((prev) => prev.map(idUpdate('pending', w.remote_id)));
                    Alert.alert(intl.formatMessage(messages.errorTitle), getFullErrorMessage(result.error));
                    return;
                }
                setWorkspaces((prev) => prev.map(idUpdate('saved', w.remote_id)));
            }
            for (const remoteId of removedIds) {
                // eslint-disable-next-line no-await-in-loop
                const result = await unshareChannelFromRemote(serverUrl, channelId, remoteId);
                if (result.error) {
                    Alert.alert(intl.formatMessage(messages.errorTitle), getFullErrorMessage(result.error));
                    return;
                }
                setToRemove((prev) => {
                    const s = new Set(prev);
                    s.delete(remoteId);
                    return s;
                });
                setWorkspaces((prev) => prev.filter(notInSet(new Set([remoteId]))));
            }
        } finally {
            savingRef.current = false;
            setSaving(false);
            onSharedRemotesChanged();
        }
    }, [channelId, intl, serverUrl, toRemove, workspaces, onSharedRemotesChanged]);

    const save = useCallback(() => {
        if (!canSave) {
            return;
        }
        if (toRemove.size > 0) {
            const toRemoveList = workspaces.filter((w) => toRemove.has(w.remote_id));
            const workspaceNames = toRemoveList.map((w) => w.display_name || w.name);
            const count = toRemoveList.length;
            const workspaceList = intl.formatList(workspaceNames);
            const connectionPhrase = intl.formatMessage(messages.unshareConfirmConnectionPhrase, {count});
            const title = intl.formatMessage(messages.unshareConfirmTitle, {connectionPhrase});
            const message = intl.formatMessage(messages.unshareConfirmMessage, {
                channelName: displayName,
                workspaceList,
                count,
            });
            Alert.alert(
                title,
                message,
                [
                    {text: intl.formatMessage(messages.cancel)},
                    {text: intl.formatMessage(messages.save), onPress: performSave},
                ],
            );
            return;
        }
        performSave();
    }, [canSave, displayName, intl, performSave, toRemove, workspaces]);

    useNavButtonPressed('save-channel-share', componentId, save, [save]);
    useAndroidHardwareBackHandler(componentId, onClose);

    useEffect(() => {
        const saveButton = buildNavigationButton(
            'save-channel-share',
            'channel_share.save.button',
            undefined,
            intl.formatMessage(messages.save),
        );
        saveButton.enabled = canSave && !saving;
        saveButton.showAsAction = 'always';
        saveButton.color = theme.sidebarHeaderTextColor;
        setButtons(componentId, {rightButtons: [saveButton]});
    }, [componentId, canSave, intl, saving, theme.sidebarHeaderTextColor]);

    const addWorkspace = useCallback(
        (remote: RemoteClusterInfo) => {
            if (savingRef.current) {
                return;
            }
            if (toRemove.has(remote.remote_id)) {
                setToRemove((prev) => {
                    const next = new Set(prev);
                    next.delete(remote.remote_id);
                    return next;
                });
                dismissBottomSheet();
                return;
            }
            if (workspaces.some((w) => w.remote_id === remote.remote_id)) {
                return;
            }
            setWorkspaces((prev) => [
                ...prev,
                {...remote, status: 'pending' as const},
            ]);
            setEnabled(true);
            dismissBottomSheet();
        },
        [toRemove, workspaces],
    );

    const openAddWorkspaceSheet = useCallback(() => {
        if (savingRef.current) {
            return;
        }

        // Exclude only workspaces that are actually sharing (in list and not marked for removal)
        const alreadyIds = new Set(
            workspaces.filter((w) => !toRemove.has(w.remote_id)).map((w) => w.remote_id),
        );
        const available = remoteClusters.filter((r) => !alreadyIds.has(r.remote_id));
        bottomSheet({
            title: intl.formatMessage(messages.connectedWorkspaces),
            theme,
            closeButtonId: 'close-add-workspace',
            snapPoints: [1, getAddWorkspaceSheetContentHeight(isTablet, available.length)],
            renderContent: () => (
                <AddWorkspaceSheetContent
                    available={available}
                    onSelect={addWorkspace}
                />
            ),
        });
    }, [intl, isTablet, remoteClusters, theme, toRemove, workspaces, addWorkspace]);

    const removeWorkspace = useCallback(
        (item: SharedChannelWorkspace) => {
            if (savingRef.current) {
                return;
            }
            if (item.status === 'pending') {
                function idFilter(w: SharedChannelWorkspace) {
                    return w.remote_id !== item.remote_id;
                }
                setWorkspaces((prev) => prev.filter(idFilter));
                if (workspaces.length <= 1) {
                    setEnabled(false);
                }
                return;
            }
            setToRemove((prev) => new Set(prev).add(item.remote_id));
        },
        [workspaces.length],
    );

    const onToggle = useCallback((value: boolean) => {
        if (savingRef.current) {
            return;
        }
        setEnabled(value);
        function statusFilter(w: SharedChannelWorkspace) {
            return w.status !== 'pending';
        }
        const originalWorkspaces = workspaces.filter(statusFilter);
        setWorkspaces(originalWorkspaces);
        if (value) {
            setToRemove(new Set());
        } else {
            setToRemove(new Set(originalWorkspaces.map((w) => w.remote_id)));
        }
    }, [workspaces]);

    const displayWorkspaces = useMemo(
        () => workspaces.filter((w) => !toRemove.has(w.remote_id)),
        [toRemove, workspaces],
    );

    if (loading) {
        return <Loading/>;
    }

    const noRemotes = remoteClusters.length === 0;

    let listTitle: string;
    if (workspaces.length > 0) {
        listTitle = intl.formatMessage(messages.workspacesSharingThisChannel);
    } else {
        listTitle = intl.formatMessage(messages.noWorkspacesSharingThisChannel);
    }

    let content;
    if (fetchError) {
        content = (
            <View style={styles.errorContainer}>
                <Text style={styles.fetchErrorTitle}>
                    {intl.formatMessage(messages.fetchErrorTitle)}
                </Text>
                <Text
                    style={styles.fetchError}
                    testID='channel_share.fetch_error'
                >
                    {fetchError}
                </Text>
            </View>

        );
    } else {
        content = (
            <ScrollView
                contentContainerStyle={styles.content}
                testID='channel_share.scroll_view'
                bounces={true}
            >
                <OptionItem
                    label={intl.formatMessage(messages.shareWithConnectedWorkspaces)}
                    description={intl.formatMessage(messages.shareWithConnectedWorkspacesDescription)}
                    type='toggle'
                    selected={enabled && !noRemotes}
                    action={onToggle}
                    disabled={noRemotes || saving}
                    testID='channel_share.toggle'
                />
                {noRemotes && (
                    <Text
                        style={styles.noRemotesWarning}
                        testID='channel_share.no_remotes_warning'
                    >
                        <CompassIcon
                            name='information-outline'
                        />
                        {' '}
                        {intl.formatMessage(messages.noRemotesWarning)}
                    </Text>
                )}
                {enabled && !noRemotes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {listTitle}
                        </Text>
                        <View>
                            {displayWorkspaces.map((w, index) => (
                                <WorkspaceItem
                                    key={w.remote_id}
                                    item={w}
                                    onRemove={removeWorkspace}
                                    isFirst={index === 0}
                                    removeDisabled={saving}
                                />
                            ))}
                        </View>
                        <Button
                            text={intl.formatMessage(messages.addWorkspace)}
                            iconName='plus'
                            onPress={openAddWorkspaceSheet}
                            theme={theme}
                            emphasis='tertiary'
                            size='lg'
                            disabled={saving}
                            testID='channel_share.add_workspace.button'
                        />
                    </View>
                )}
            </ScrollView>
        );
    }

    return (
        <View
            style={styles.flex}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='channel_share.screen'
            >
                {content}
            </SafeAreaView>
        </View>
    );
};

export default ChannelShare;
