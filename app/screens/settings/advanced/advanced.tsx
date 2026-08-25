// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Pressable, type PressableStateCallbackType} from 'react-native';

import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidMount from '@hooks/did_mount';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack, navigateToSettingsScreen} from '@screens/navigation';
import {deleteFileCache, getAllFilesInCachesDirectory, getFormattedFileSize} from '@utils/file';

import type {FileInfo} from 'expo-file-system';

const EMPTY_FILES: FileInfo[] = [];

type AdvancedSettingsProps = {
    isDevMode: boolean;
};
const AdvancedSettings = ({
    isDevMode,
}: AdvancedSettingsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [dataSize, setDataSize] = useState<number | undefined>(0);
    const [files, setFiles] = useState<FileInfo[]>(EMPTY_FILES);

    const getAllCachedFiles = useCallback(() => {
        const {totalSize = 0, files: cachedFiles} = getAllFilesInCachesDirectory(serverUrl);
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
                            onPress: () => {
                                deleteFileCache(serverUrl);
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
        navigateToSettingsScreen(Screens.COMPONENT_LIBRARY);
    }, []);

    useDidMount(() => {
        getAllCachedFiles();
    });

    useAndroidHardwareBackHandler(Screens.SETTINGS_ADVANCED, navigateBack);

    const hasData = Boolean(dataSize && dataSize > 0);

    const pressedStyleFn = useCallback(({pressed}: PressableStateCallbackType) => (pressed && hasData && {opacity: 0.72}), [hasData]);
    const pressedStyleDevFn = useCallback(({pressed}: PressableStateCallbackType) => (pressed && {opacity: 0.72}), []);

    return (
        <SettingContainer testID='advanced_settings'>
            <Pressable
                onPress={onPressDeleteData}
                disabled={!hasData}
                style={pressedStyleFn}
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
                    style={pressedStyleDevFn}
                >
                    <SettingOption
                        label={intl.formatMessage({id: 'settings.advanced.component_library', defaultMessage: 'Component library'})}
                        testID='advanced_settings.component_library.option'
                        type='none'
                    />
                    <SettingSeparator/>
                </Pressable>
            )}
        </SettingContainer>
    );
};

export default AdvancedSettings;
