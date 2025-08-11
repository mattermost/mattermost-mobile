// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {DeviceEventEmitter, StyleSheet, Text, View} from 'react-native';
import {RectButton, Pressable} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import FileIcon from '@components/files/file_icon';
import {Events, Preferences} from '@constants';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isDocument, isPdf} from '@utils/file';
import {galleryItemToFileInfo} from '@utils/gallery';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import type {GalleryAction, GalleryItemType} from '@typings/screens/gallery';

type Props = {
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
    item: GalleryItemType;
    hideHeaderAndFooter: (hide?: boolean) => void;
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

const messages = defineMessages({
    unsupported: {
        id: 'gallery.unsupported',
        defaultMessage: "Preview isn't supported for this file type. Try downloading or sharing to open it in another app.",
    },
    openFile: {
        id: 'gallery.open_file',
        defaultMessage: 'Open file',
    },
    onlyPdf: {
        id: 'gallery.only_pdf',
        defaultMessage: 'Only PDF files are supported for secure file preview.',
    },
});

const DocumentRenderer = ({canDownloadFiles, enableSecureFilePreview, item, hideHeaderAndFooter}: Props) => {
    const {formatMessage} = useIntl();
    const file = useMemo(() => galleryItemToFileInfo(item), [item]);
    const [enabled, setEnabled] = useState(true);
    const isSupported = useMemo(() => isDocument(file), [file]);
    const canOpenFile = useMemo(() => {
        if (!isSupported) {
            return false;
        }
        if (enableSecureFilePreview && isPdf(file)) {
            return true;
        }

        return !enableSecureFilePreview && canDownloadFiles;
    }, [canDownloadFiles, enableSecureFilePreview, file, isSupported]);

    const optionText = useMemo(() => {
        if (enableSecureFilePreview && !isPdf(file)) {
            return formatMessage(messages.onlyPdf);
        } else if (!isSupported) {
            return formatMessage(messages.unsupported);
        }
        return formatMessage(messages.openFile);
    }, [enableSecureFilePreview, file, formatMessage, isSupported]);

    const setGalleryAction = useCallback((action: GalleryAction) => {
        DeviceEventEmitter.emit(Events.GALLERY_ACTIONS, action);
        if (action === 'none') {
            setEnabled(true);
        }
    }, []);

    const handleOpenFile = useCallback(() => {
        setEnabled(false);
    }, []);

    const handlePdfPreview = useCallback(() => {
        if (enableSecureFilePreview && isPdf(file)) {
            DeviceEventEmitter.emit(Events.CLOSE_GALLERY);
            return;
        }

        hideHeaderAndFooter();
    }, [file, enableSecureFilePreview, hideHeaderAndFooter]);

    return (
        <>
            <Pressable onPress={handlePdfPreview}>
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
                    {canOpenFile &&
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
            </Pressable>
            {!enabled &&
            <DownloadWithAction
                action='opening'
                enableSecureFilePreview={enableSecureFilePreview}
                setAction={setGalleryAction}
                item={item}
                onDownloadSuccess={handlePdfPreview}
            />
            }
        </>
    );
};

export default DocumentRenderer;
