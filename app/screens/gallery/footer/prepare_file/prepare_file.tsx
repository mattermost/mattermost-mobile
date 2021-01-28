// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useEffect, useRef, useState, useImperativeHandle} from 'react';
import {intlShape} from 'react-intl';
import {Alert, Platform, StyleSheet, Text, View, ViewStyle} from 'react-native';
import RNFetchBlob, {FetchBlobResponse, RNFetchBlobConfig, StatefulPromise} from 'rn-fetch-blob';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Share from 'react-native-share';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ProgressBar from '@components/progress_bar';
import {Client4} from '@mm-redux/client';
import {getLocalPath} from '@utils/file';
import mattermostBucket from 'app/mattermost_bucket';

import type {FileInfo} from '@mm-redux/types/files';
import {Theme} from '@mm-redux/types/preferences';
import type {PrepareFileRef} from 'types/screens/gallery';

type PrepareFileProps = {
    intl: typeof intlShape;
    isLandscape: boolean;
    theme: Theme,
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000000',
        flexDirection: 'row',
        height: Platform.select({ios: 99, android: 85}),
        paddingHorizontal: 12,
        paddingTop: 20,
    },
    containerLandscape: {
        height: 64,
    },
    saving: {
        color: '#FFFFFF',
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 20,
    },
});

const PrepareFile = forwardRef<PrepareFileRef, PrepareFileProps>(({intl, isLandscape, theme}: PrepareFileProps, ref) => {
    const containerStyles: Array<ViewStyle> = [styles.container];
    let downloadTask = useRef<StatefulPromise<FetchBlobResponse>>().current;
    const insets = useSafeAreaInsets();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const start = async (file: FileInfo, share = true): Promise<string | undefined> => {
        const localPath = getLocalPath(file);
        let uri;
        let certificate;

        if (file.id.startsWith('uid') && file.uri) {
            uri = file.uri;
        } else {
            uri = Client4.getFileUrl(file.id, Date.now());
            certificate = await mattermostBucket.getPreference('cert');
        }

        const options: RNFetchBlobConfig = {
            session: file.id,
            appendExt: file.extension,
            timeout: 10000,
            indicator: true,
            overwrite: true,
            path: localPath,
            certificate,
        };

        let path;
        try {
            const exist = await RNFetchBlob.fs.exists(localPath);
            if (exist) {
                path = localPath;
            } else {
                setVisible(true);
                downloadTask = RNFetchBlob.config(options).fetch('GET', uri);
                downloadTask.progress((received: number, total: number) => {
                    setProgress(parseFloat((received / total).toFixed(1)));
                });
                const response = await downloadTask;
                path = response.path();
                file.localPath = path;
            }
        } catch (e) {
            if (downloadTask) {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.prepare_file.failed_title',
                        defaultMessage: 'Preparing failed',
                    }),
                    intl.formatMessage({
                        id: 'mobile.prepare_file.failed_description',
                        defaultMessage: 'An error occurred while preparing the file. Please try again.\n',
                    }),
                    [{
                        text: intl.formatMessage({
                            id: 'mobile.server_upgrade.button',
                            defaultMessage: 'OK',
                        }),
                    }],
                );

                if (path) {
                    RNFetchBlob.fs.unlink(path);
                    file.localPath = undefined;
                }
                path = undefined;
            }
        } finally {
            setVisible(false);
            downloadTask = undefined;
        }

        if (path && share) {
            Share.open({
                url: `file://${path}`,
                showAppsToView: true,
            }).catch(() => {
                // do nothing
            });
        }

        return path;
    };

    useEffect(() => {
        return () => {
            if (downloadTask) {
                downloadTask.cancel();
                setVisible(false);
            }
        };
    }, []);

    useImperativeHandle(ref, () => ({
        start,
    }));

    if (isLandscape) {
        containerStyles.push(styles.containerLandscape);
    }

    if (!visible) {
        return null;
    }

    let label = <Text style={styles.saving}>{`${progress * 100}%`}</Text>;
    if (progress >= 1) {
        label = (
            <CompassIcon
                name='check'
                size={24}
                color='white'
                style={{fontWeight: '600', top: -5}}
            />
        );
    }

    return (
        <View style={[containerStyles, {paddingLeft: insets.left, paddingRight: insets.right}]}>
            <FormattedText
                id='mobile.prepare_file.text'
                defaultMessage='Preparing'
                style={styles.saving}
            />
            <View style={{marginTop: 10, flex: 1, marginHorizontal: 7, alignItems: 'flex-start'}}>
                <ProgressBar
                    progress={progress}
                    color={theme.buttonBg}
                />
            </View>
            <View style={{alignItems: 'center'}}>
                {label}
            </View>
        </View>
    );
});

PrepareFile.displayName = 'PrepareFile';

export default PrepareFile;
