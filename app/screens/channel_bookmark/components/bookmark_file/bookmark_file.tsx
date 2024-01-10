// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, type AlertButton} from 'react-native';
import {Shadow} from 'react-native-shadow-2';

import Button from '@components/button';
import File from '@components/files/file';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {fileSizeWarning, getExtensionFromMime} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {emptyFunction} from '@utils/general';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    close: () => void;
    disabled: boolean;
    initialFile?: FileInfo;
    maxFileSize: number;
    onError: (error: string, buttons?: AlertButton[]) => void;
    setBookmark: (file: ExtractedFileInfo) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    viewContainer: {
        marginVertical: 32,
        width: '100%',
        flex: 0,
    },
    title: {
        color: theme.centerChannelColor,
        marginBottom: 8,
        ...typography('Heading', 100, 'SemiBold'),
    },
    shadowContainer: {flexDirection: 'row', marginBottom: 16, alignItems: 'center'},
}));

const shadowSides = {top: false, bottom: true, end: true, start: false};

const BookmarkFile = ({close, disabled, initialFile, maxFileSize, onError, setBookmark}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const [file, setFile] = useState<ExtractedFileInfo|undefined>(initialFile);
    const styles = getStyleSheet(theme);
    const subContainerStyle = [styles.viewContainer, {paddingHorizontal: isTablet ? 42 : 0}];

    const browseFile = async () => {
        const picker = new PickerUtil(intl, (files) => {
            if (files.length) {
                const f = files[0];
                const extension = getExtensionFromMime(f.mime_type);
                setFile({...f, extension});
            }
        });

        const res = await picker.attachFileFromFiles(undefined, false);
        if (res.error) {
            close();
        }
    };

    useEffect(() => {
        if (!initialFile) {
            browseFile();
        }
    }, []);

    useEffect(() => {
        if (!file?.id && (file?.size || 0) > maxFileSize) {
            onError(
                fileSizeWarning(intl, maxFileSize), [{
                    text: intl.formatMessage({
                        id: 'channel_bookmark.add.file_select_another',
                        defaultMessage: 'Select another file',
                    }),
                    onPress: browseFile,
                    isPreferred: true,
                }, {
                    text: intl.formatMessage({
                        id: 'channel_bookmark.add.file_cancel',
                        defaultMessage: 'Cancel',
                    }),
                    onPress: close,
                    style: 'cancel',
                }]);
            return;
        }

        if (!file?.id && file?.name) {
            setBookmark(file);
        }
    }, [file, intl, maxFileSize]);

    if (file) {
        return (
            <View style={subContainerStyle}>
                <FormattedText
                    id='channel_bookmark.add.file_title'
                    defaultMessage='Attachment'
                    style={styles.title}
                />
                <Shadow
                    style={styles.shadowContainer}
                    startColor='rgba(61, 60, 64, 0.08)'
                    distance={4}
                    sides={shadowSides}
                >
                    <File
                        asCard={true}
                        file={file as FileInfo}
                        canDownloadFiles={true}
                        galleryIdentifier='bookmark'
                        index={0}
                        onPress={emptyFunction}
                        publicLinkEnabled={false}
                        updateFileForGallery={emptyFunction}
                        inViewPort={false}
                        nonVisibleImagesCount={0}
                        isSingleImage={true}
                        wrapperWidth={0}
                        resizeMode='contain'
                        onPressDisabled={true}
                    />
                </Shadow>
                <Button
                    theme={theme}
                    size='m'
                    emphasis='primary'
                    buttonType='default'
                    text={intl.formatMessage({id: 'channel_bookmark_edit', defaultMessage: 'Edit'})}
                    onPress={browseFile}
                    iconName='pencil-outline'
                    iconSize={18}
                    disabled={disabled}
                />
            </View>
        );
    }

    return null;
};

export default BookmarkFile;
