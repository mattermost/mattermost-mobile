// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as FileSystem from 'expo-file-system';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {NativeModules, Platform, StyleSheet, Text, View} from 'react-native';
import FileViewer from 'react-native-file-viewer';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import Share from 'react-native-share';

import {typography} from '@app/utils/typography';
import CompassIcon from '@components/compass_icon';
import ProgressBar from '@components/progress_bar';
import Toast from '@components/toast';
import {GALLERY_FOOTER_HEIGHT} from '@constants/gallery';
import {DOWNLOAD_TIMEOUT} from '@constants/network';
import {useServerUrl} from '@context/server';
import NetworkManager from '@init/network_manager';
import {alertFailedToOpenDocument} from '@utils/document';
import {fileExists, getLocalFilePathFromFile} from '@utils/file';
import {galleryItemToFileInfo} from '@utils/gallery';

import type {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';

type Props = {
    action: GalleryAction;
    item: GalleryItemType;
    setAction: (action: GalleryAction) => void;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
    },
    toast: {
        backgroundColor: '#3F4350', // intended hardcoded color
    },
    error: {
        backgroundColor: '#D24B4E',
    },
    option: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        flex: 1,
        marginTop: 8,
    },
    progress: {
        marginTop: -10,
        width: '85%',
    },
    title: {
        color: '#FFF',
        ...typography('Body', 75, 'SemiBold'),
    },
});

const DownloadWithAction = ({action, item, setAction}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [started, setStarted] = useState<boolean|undefined>();
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const mounted = useRef(false);
    const downloadPromise = useRef<ProgressPromise<ClientResponse>>();
    const title = useMemo(() => {
        switch (action) {
            case 'sharing':
                return intl.formatMessage({id: 'gallery.preparing', defaultMessage: 'Preparing...'});
            case 'opening':
                return intl.formatMessage({id: 'gallery.opening', defaultMessage: 'Opening...'});
            default:
                return intl.formatMessage({id: 'gallery.downloading', defaultMessage: 'Downloading...'});
        }
    }, [action]);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        bottom: GALLERY_FOOTER_HEIGHT + 8,
        opacity: withTiming(started ? 1 : 0, {duration: 300}),
    }));

    const cancel = async () => {
        try {
            await downloadPromise.current?.cancel?.();
            const path = getLocalFilePathFromFile(serverUrl, galleryItemToFileInfo(item));
            await FileSystem.deleteAsync(path, {idempotent: true});

            downloadPromise.current = undefined;
        } catch {
            // do nothing
        } finally {
            if (mounted.current) {
                setStarted(false);
            }
        }
    };

    const openFile = async (response: ClientResponse) => {
        if (mounted.current) {
            if (response.data?.path) {
                const path = response.data.path as string;
                FileViewer.open(path, {
                    displayName: item.name,
                    showAppsSuggestions: true,
                    showOpenWithDialog: true,
                }).catch(() => {
                    const file = galleryItemToFileInfo(item);
                    alertFailedToOpenDocument(file, intl);
                });
            }
            setStarted(false);
        }
    };

    const saveFile = async (response: ClientResponse) => {
        if (mounted.current) {
            if (response.data?.path) {
                const path = response.data.path as string;
                if (Platform.OS === 'android') {
                    try {
                        await NativeModules.MattermostManaged.saveFile(path.replace('file://', '/'));
                    } catch {
                        // do nothing in case the user decides not to save the file
                    }
                    setAction('none');
                    return;
                }

                Share.open({
                    url: path,
                    saveToFiles: true,
                }).catch(() => {
                    // do nothing
                });
            }
            setStarted(false);
        }
    };

    const shareFile = async (response: ClientResponse) => {
        if (mounted.current) {
            if (response.data?.path) {
                const path = response.data.path as string;
                Share.open({
                    message: '',
                    title: '',
                    url: path,
                    showAppsToView: true,
                }).catch(() => {
                    // do nothing
                });
            }
            setStarted(false);
        }
    };

    const startDownload = async () => {
        try {
            const path = getLocalFilePathFromFile(serverUrl, galleryItemToFileInfo(item));
            if (path) {
                const exists = await fileExists(path);
                let actionToExecute: (request: ClientResponse) => Promise<void>;
                switch (action) {
                    case 'sharing':
                        actionToExecute = shareFile;
                        break;
                    case 'opening':
                        actionToExecute = openFile;
                        break;
                    default:
                        actionToExecute = saveFile;
                        break;
                }
                if (exists) {
                    setProgress(100);
                    actionToExecute({
                        code: 200,
                        ok: true,
                        data: {path},
                    });
                } else {
                    const client = NetworkManager.getClient(serverUrl);
                    downloadPromise.current = client.apiClient.download(client.getFileRoute(item.id!), path.replace('file://', ''), {timeoutInterval: DOWNLOAD_TIMEOUT});
                    downloadPromise.current?.then(actionToExecute).catch(() => {
                        setError(intl.formatMessage({id: 'download.error', defaultMessage: 'Unable to download the file. Try again later'}));
                    });
                    downloadPromise.current?.progress?.(setProgress);
                }
            }
        } catch (e) {
            setStarted(false);
        }
    };

    useEffect(() => {
        mounted.current = true;
        setStarted(true);
        startDownload();

        return () => {
            mounted.current = false;
            if (downloadPromise.current) {
                downloadPromise.current.cancel?.();
            }
        };
    }, []);

    useEffect(() => {
        if (started === false) {
            setTimeout(() => {
                if (mounted.current) {
                    setAction('none');
                }
            }, 350);
        }
    }, [started]);

    return (
        <Toast
            animatedStyle={animatedStyle}
            style={error ? styles.error : styles.toast}
            message={error || undefined}
            iconName={error ? 'alert-circle-outline' : undefined}
        >
            {!error &&
                <View style={styles.container}>
                    <View style={styles.progress}>
                        <Text style={styles.title}>{title}</Text>
                        <ProgressBar
                            color='#fff'
                            progress={progress}
                            style={{marginTop: 5}}
                        />
                    </View>
                    <View style={styles.option}>
                        <TouchableOpacity onPress={cancel}>
                            <CompassIcon
                                color='#FFF'
                                name='close'
                                size={24}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            }
        </Toast>
    );
};

export default DownloadWithAction;
