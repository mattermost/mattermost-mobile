// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {injectIntl} from 'react-intl';
import {Alert, Platform, View} from 'react-native';
import Video from 'react-native-video';
import RNFetchBlob from 'rn-fetch-blob';

import {Client4} from '@client/rest';
import {DeviceTypes} from '@constants';
import {ATTACHMENT_DOWNLOAD} from '@constants/attachment';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {getLocalPath} from '@utils/file';

import type {GalleryItemProps} from '@mm-types/screens/gallery';

const GalleryVideo = ({file, deviceHeight, deviceWidth, intl, isActive, showHideHeaderFooter}: GalleryItemProps) => {
    const statusBar = DeviceTypes.IS_IPHONE_WITH_INSETS ? 0 : 20;
    const width = deviceWidth;
    const height = deviceHeight - (2 * statusBar);

    const [uri, setUri] = useState(file.localPath);
    const videoRef = useRef<Video>(null);

    const videoError = useCallback(() => {
        Alert.alert(
            intl.formatMessage({
                id: 'mobile.video_playback.failed_title',
                defaultMessage: 'Video playback failed',
            }),
            intl.formatMessage({
                id: 'mobile.video_playback.failed_description',
                defaultMessage: 'An error occurred while trying to play the video.\n',
            }),
            [{
                text: intl.formatMessage({
                    id: 'mobile.video_playback.download',
                    defaultMessage: 'Download Video',
                }),
                onPress: () => {
                    EventEmitter.emit(ATTACHMENT_DOWNLOAD, false, (path: string) => {
                        setUri(path);
                    });
                },
            }, {
                text: intl.formatMessage({
                    id: 'mobile.alert_dialog.alertCancel',
                    defaultMessage: 'Cancel',
                }),
                onPress: () => {
                    showHideHeaderFooter?.(true);
                },
            }],
        );
    }, []);

    useEffect(() => {
        const getUriFromFile = async () => {
            if (!uri) {
                const localPath = getLocalPath(file);
                const prefix = Platform.OS === 'android' ? 'file:/' : '';
                const exist = await RNFetchBlob.fs.exists(`${prefix}${localPath}`);
                setUri(exist ? localPath : Client4.getFileUrl(file.id, Date.now()));
            }
        };

        getUriFromFile();
    }, []);

    if (!uri || !isActive) {
        return null;
    }
    return (
        <>
            <View>
                <Video
                    ref={videoRef}
                    style={{width, height}}
                    resizeMode='contain'
                    source={{uri}}
                    volume={1.0}
                    paused={false}
                    controls={true}
                    onError={videoError}
                    onTouchStart={
                        () => {
                            showHideHeaderFooter?.(true);
                        }
                    }
                />
            </View>
        </>
    );
};

export default injectIntl(GalleryVideo);
