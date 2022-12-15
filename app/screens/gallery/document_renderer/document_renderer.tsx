// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, StyleSheet, Text, View} from 'react-native';
import {RectButton, TouchableWithoutFeedback} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import FileIcon from '@components/files/file_icon';
import {Events, Preferences} from '@constants';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isDocument} from '@utils/file';
import {galleryItemToFileInfo} from '@utils/gallery';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import DownloadWithAction from '../footer/download_with_action';

import type {GalleryAction, GalleryItemType} from '@typings/screens/gallery';

type Props = {
    canDownloadFiles: boolean;
    item: GalleryItemType;
    onShouldHideControls: (hide: boolean) => void;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        maxWidth: 600,
    },
    filename: {
        color: '#FFF',
        ...typography('Body', 200, 'SemiBold'),
        marginVertical: 8,
        paddingHorizontal: 25,
        textAlign: 'center',
    },
    unsupported: {
        color: '#FFF',
        ...typography('Body', 100, 'SemiBold'),
        marginTop: 10,
        paddingHorizontal: 25,
        opacity: 0.64,
        textAlign: 'center',
    },
});

const DocumentRenderer = ({canDownloadFiles, item, onShouldHideControls}: Props) => {
    const {formatMessage} = useIntl();
    const file = useMemo(() => galleryItemToFileInfo(item), [item]);
    const [controls, setControls] = useState(true);
    const [enabled, setEnabled] = useState(true);
    const isSupported = useMemo(() => isDocument(file), [file]);
    const optionText = isSupported ? formatMessage({
        id: 'gallery.open_file',
        defaultMessage: 'Open file',
    }) : formatMessage({
        id: 'gallery.unsupported',
        defaultMessage: "Preview isn't supported for this file type. Try downloading or sharing to open it in another app.",
    });

    const handleHideControls = useCallback(() => {
        onShouldHideControls(controls);
        setControls(!controls);
    }, [controls, onShouldHideControls]);

    const setGalleryAction = useCallback((action: GalleryAction) => {
        DeviceEventEmitter.emit(Events.GALLERY_ACTIONS, action);
        if (action === 'none') {
            setEnabled(true);
        }
    }, []);

    const handleOpenFile = useCallback(() => {
        setEnabled(false);
    }, []);

    return (
        <>
            <TouchableWithoutFeedback onPress={handleHideControls}>
                <Animated.View style={styles.container}>
                    <FileIcon
                        backgroundColor='transparent'
                        file={file}
                        iconSize={120}
                    />
                    <Text
                        numberOfLines={2}
                        style={styles.filename}
                    >
                        {item.name}
                    </Text>
                    {!isSupported &&
                    <Text style={styles.unsupported}>{optionText}</Text>
                    }
                    {isSupported && canDownloadFiles &&
                    <View style={{marginTop: 16}}>
                        <RectButton
                            enabled={enabled}
                            exclusive={true}
                            onPress={handleOpenFile}
                            rippleColor={changeOpacity('#fff', 0.16)}
                        >
                            <View style={buttonBackgroundStyle(Preferences.THEMES.onyx, 'lg', 'primary', enabled ? 'default' : 'disabled')}>
                                <Text style={buttonTextStyle(Preferences.THEMES.onyx, 'lg', 'primary', enabled ? 'default' : 'disabled')} >{optionText}</Text>
                            </View>
                        </RectButton>
                    </View>
                    }
                </Animated.View>
            </TouchableWithoutFeedback>
            {!enabled &&
            <DownloadWithAction
                action='opening'
                setAction={setGalleryAction}
                item={item}
            />
            }
        </>
    );
};

export default DocumentRenderer;
