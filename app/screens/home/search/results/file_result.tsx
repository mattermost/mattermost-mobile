// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';

import File from '@components/files/file';
import {useIsTablet} from '@hooks/device';
import {getViewPortWidth} from '@utils/images';

import FileOptions from './file_options';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginHorizontal: 20,
        zIndex: 12,
    },
});

type Props = {
    canDownloadFiles: boolean;
    channelName: string | undefined;
    fileInfo: FileInfo;
    index: number;
    isSingleImage: boolean;
    onOptionsPress: (item: number) => void;
    onPress: (idx: number) => void;
    optionSelected: boolean;
    publicLinkEnabled: boolean;
    setSelectedItemNumber: (value: number) => void;
    updateFileForGallery: (idx: number, file: FileInfo) => void;
}

const galleryIdentifier = 'search-files-location';

const FileResult = ({
    canDownloadFiles,
    channelName,
    fileInfo,
    index,
    isSingleImage,
    onOptionsPress,
    onPress,
    optionSelected,
    publicLinkEnabled,
    setSelectedItemNumber,
    updateFileForGallery,
}: Props) => {
    const isTablet = useIsTablet();
    const isReplyPost = false;
    const elementsRef = useRef<View | null>(null);
    const {height} = Dimensions.get('window');
    const [openUp, setOpenUp] = useState<boolean | null>(null);

    const fileRef = useCallback((element: View) => {
        if (optionSelected) {
            elementsRef.current = element;
            elementsRef?.current?.measureInWindow((_, y) => {
                setOpenUp((y > height / 2));
            });
        }
    }, [optionSelected]);

    return (
        <View
            ref={fileRef}
            style={styles.container}
        >
            <File
                asCard={true}
                canDownloadFiles={canDownloadFiles}
                channelName={channelName}
                file={fileInfo}
                galleryIdentifier={galleryIdentifier}
                inViewPort={true}
                index={index}
                isSingleImage={isSingleImage}
                nonVisibleImagesCount={0}
                onOptionsPress={onOptionsPress}
                optionSelected={optionSelected}
                onPress={onPress}
                publicLinkEnabled={publicLinkEnabled}
                showDate={true}
                updateFileForGallery={updateFileForGallery}
                wrapperWidth={(getViewPortWidth(isReplyPost, isTablet) - 6)}
            />
            {isTablet && optionSelected && (openUp !== null) &&
            <FileOptions
                fileInfo={fileInfo}
                setSelectedItemNumber={setSelectedItemNumber}
                openUp={openUp}
            />
            }
        </View>
    );
};

export default FileResult;
