// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';

import File from '@components/files/file';
import {useIsTablet} from '@hooks/device';
import {getViewPortWidth} from '@utils/images';

import TabletOptions from './file_options/tablet_options';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginHorizontal: 20,
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
    setSelectedItemNumber: (value: number | undefined) => void;
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
    const elementsRef = useRef<View | null>(null);
    const isTablet = useIsTablet();
    const isReplyPost = false;

    const [isOpen, setIsOpen] = useState(false);
    const [openUp, setOpenUp] = useState<boolean>(false);
    const [xOffset, setXoffset] = useState(0);
    const [yOffset, setYoffset] = useState(0);
    const {height} = Dimensions.get('window');

    const fileRef = useCallback((element: View) => {
        if (optionSelected) {
            elementsRef.current = element;
            elementsRef?.current?.measureInWindow((x, y) => {
                setOpenUp((y > height / 2));
                setYoffset(y);
                setXoffset(x);
                setIsOpen(true);
            });
        }
    }, [optionSelected]);

    return (
        <>
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
                    onPress={onPress}
                    optionSelected={optionSelected}
                    publicLinkEnabled={publicLinkEnabled}
                    showDate={true}
                    updateFileForGallery={updateFileForGallery}
                    wrapperWidth={(getViewPortWidth(isReplyPost, isTablet) - 6)}
                />
                {isTablet && isOpen &&
                    <TabletOptions
                        canDownloadFiles={canDownloadFiles}
                        fileInfo={fileInfo}
                        optionSelected={optionSelected}
                        openUp={openUp}
                        publicLinkEnabled={publicLinkEnabled}
                        setSelectedItemNumber={setSelectedItemNumber}
                        xOffset={xOffset}
                        yOffset={yOffset}
                    />
                }
            </View>
        </>
    );
};

export default FileResult;
