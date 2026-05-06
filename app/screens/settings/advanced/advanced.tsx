// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Pressable} from 'react-native';

import {storeResizeImages, storeResizeImagesMaxDimension} from '@actions/app/global';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import TextSetting from '@components/settings/text_setting';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidMount from '@hooks/did_mount';
import {usePreventDoubleTap} from '@hooks/utils';
import {goToScreen, popTopScreen} from '@screens/navigation';
import {deleteFileCache, getAllFilesInCachesDirectory, getFormattedFileSize} from '@utils/file';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {FileInfo} from 'expo-file-system';

const EMPTY_FILES: FileInfo[] = [];

type AdvancedSettingsProps = {
    componentId: AvailableScreens;
    isDevMode: boolean;
    resizeImages: boolean;
    resizeImagesMaxDimension: number;
};

const AdvancedSettings = ({
    componentId,
    isDevMode,
    resizeImages,
    resizeImagesMaxDimension,
}: AdvancedSettingsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [dataSize, setDataSize] = useState<number | undefined>(0);
    const [files, setFiles] = useState<FileInfo[]>(EMPTY_FILES);
    const [dimensionText, setDimensionText] = useState(() => String(resizeImagesMaxDimension));

    useEffect(() => {
        setDimensionText(String(resizeImagesMaxDimension));

        // resizeImagesMaxDimension is the only meaningful dep; dimensionText is local state we're syncing
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resizeImagesMaxDimension]);

    const getAllCachedFiles = useCallback(async () => {
        const {totalSize = 0, files: cachedFiles} = await getAllFilesInCachesDirectory(serverUrl);
        setDataSize(totalSize);
        setFiles(cachedFiles || EMPTY_FILES);
    }, [serverUrl]);

    const onPressDeleteData = usePreventDoubleTap(useCallback(async () => {
        try {
            if (files.length > 0) {
                const {formatMessage} = intl;

                Alert.alert(
                    formatMessage({id: 'settings.advanced.delete_data', defaultMessage: 'Delete local files'}),
                    formatMessage({
                        id: 'settings.advanced.delete_message.confirmation',
                        defaultMessage: '\nThis will delete all files downloaded through the app for this server. Please confirm to proceed.\n',
                    }),
                    [
                        {text: formatMessage({id: 'settings.advanced.cancel', defaultMessage: 'Cancel'}), style: 'cancel'},
                        {
                            text: formatMessage({id: 'settings.advanced.delete', defaultMessage: 'Delete'}),
                            style: 'destructive',
                            onPress: async () => {
                                await deleteFileCache(serverUrl);
                                getAllCachedFiles();
                            },
                        },
                    ],
                    {cancelable: false},
                );
            }
        } catch (e) {
            //do nothing
        }
    }, [files.length, getAllCachedFiles, intl, serverUrl]));

    const onPressComponentLibrary = useCallback(() => {
        const screen = Screens.COMPONENT_LIBRARY;
        const title = intl.formatMessage({id: 'settings.advanced_settings.component_library', defaultMessage: 'Component library'});

        goToScreen(screen, title);
    }, [intl]);

    const onToggleResizeImages = useCallback((value: string | boolean) => {
        storeResizeImages(Boolean(value));
    }, []);

    const onDimensionChange = useCallback((value: string) => {
        setDimensionText(value);
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed) && parsed >= 100 && parsed <= 9999) {
            storeResizeImagesMaxDimension(parsed);
        }
    }, []);

    useDidMount(() => {
        getAllCachedFiles();
    });

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const hasData = Boolean(dataSize && dataSize > 0);

    const parsedDimension = parseInt(dimensionText, 10);
    const dimensionError = dimensionText.length > 0 && (isNaN(parsedDimension) || parsedDimension < 100 || parsedDimension > 9999)
        ? intl.formatMessage({id: 'settings.advanced.resize_max_dimension.error', defaultMessage: 'Must be between 100 and 9999'})
        : undefined;

    return (
        <SettingContainer testID='advanced_settings'>
            <Pressable
                onPress={onPressDeleteData}
                disabled={!hasData}
                style={({pressed}) => (pressed && hasData ? {opacity: 0.72} : undefined)}
            >
                <SettingOption
                    destructive={true}
                    icon='trash-can-outline'
                    info={getFormattedFileSize(dataSize || 0)}
                    label={intl.formatMessage({id: 'settings.advanced.delete_data', defaultMessage: 'Delete local files'})}
                    testID='advanced_settings.delete_data.option'
                    type='none'
                />
                <SettingSeparator/>
            </Pressable>
            {isDevMode && (
                <Pressable
                    onPress={onPressComponentLibrary}
                    style={({pressed}) => (pressed ? {opacity: 0.72} : undefined)}
                >
                    <SettingOption
                        label={intl.formatMessage({id: 'settings.advanced.component_library', defaultMessage: 'Component library'})}
                        testID='advanced_settings.component_library.option'
                        type='none'
                    />
                    <SettingSeparator/>
                </Pressable>
            )}
            <SettingOption
                action={onToggleResizeImages}
                icon='image-outline'
                label={intl.formatMessage({id: 'settings.advanced.resize_images', defaultMessage: 'Resize images before uploading'})}
                selected={resizeImages}
                testID='advanced_settings.resize_images.option'
                type='toggle'
            />
            <SettingSeparator/>
            {resizeImages && (
                <>
                    <TextSetting
                        disabled={false}
                        errorText={dimensionError}
                        keyboardType='numeric'
                        label={intl.formatMessage({id: 'settings.advanced.resize_max_dimension', defaultMessage: 'Maximum dimension (px)'})}
                        location={Screens.SETTINGS_ADVANCED}
                        multiline={false}
                        onChange={onDimensionChange}
                        optional={false}
                        secureTextEntry={false}
                        testID='advanced_settings.resize_max_dimension'
                        value={dimensionText}
                    />
                    <SettingSeparator/>
                </>
            )}
        </SettingContainer>
    );
};

export default AdvancedSettings;
