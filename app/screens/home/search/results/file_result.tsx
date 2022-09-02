// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Dimensions, StyleSheet, View} from 'react-native';

import {showPermalink} from '@actions/remote/permalink';
import {useServerUrl} from '@app/context/server';
import File from '@components/files/file';
import {useIsTablet} from '@hooks/device';
import {GalleryAction} from '@typings/screens/gallery';
import {getViewPortWidth} from '@utils/images';

import TabletOptions from './file_options/tablet_options';
import Toasts from './file_options/toasts';

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
    numOptions: number;
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
    numOptions,
    onOptionsPress,
    onPress,
    optionSelected,
    publicLinkEnabled,
    setSelectedItemNumber,
    updateFileForGallery,
}: Props) => {
    const elementsRef = useRef<View | null>(null);
    const isTablet = useIsTablet();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const isReplyPost = false;
    const [action, setAction] = useState<GalleryAction>('none');
    const [showToasts, setShowToasts] = useState(false);
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

    const handleCopyLink = useCallback(() => {
        setAction('copying');
        setSelectedItemNumber?.(undefined);
        setShowToasts(true);
        setIsOpen?.(false);
    }, [setSelectedItemNumber]);

    const handleDownload = useCallback(() => {
        setAction('downloading');
        setSelectedItemNumber?.(undefined);
        setShowToasts(true);

        // setIsOpen?.(false);
    }, [setSelectedItemNumber]);

    const handlePermalink = useCallback(() => {
        showPermalink(serverUrl, '', fileInfo.post_id, intl);
        setSelectedItemNumber?.(undefined);

        // setIsOpen?.(false);
    }, [fileInfo.post_id, intl, serverUrl, setSelectedItemNumber]);

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
                        handleCopyLink={handleCopyLink}
                        handleDownload={handleDownload}
                        handlePermalink={handlePermalink}
                        numOptions={numOptions}
                        optionSelected={optionSelected}
                        openUp={openUp}
                        publicLinkEnabled={publicLinkEnabled}
                        setIsOpen={setIsOpen}
                        setSelectedItemNumber={setSelectedItemNumber}
                        xOffset={xOffset}
                        yOffset={yOffset}
                    />
                }
            </View>
            {isTablet && showToasts &&
                <Toasts
                    action={action}
                    fileInfo={fileInfo}
                    setAction={setAction}
                    setSelectedItemNumber={setSelectedItemNumber}
                />
            }
        </>
    );
};

export default FileResult;
