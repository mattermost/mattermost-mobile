// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, TouchableOpacity} from 'react-native';

import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {goToScreen, popTopScreen} from '@screens/navigation';
import {deleteFileCache, getAllFilesInCachesDirectory, getFormattedFileSize} from '@utils/file';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {FileInfo} from 'expo-file-system';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        itemStyle: {
            backgroundColor: theme.centerChannelBg,
            paddingHorizontal: 20,
        },
    };
});

const EMPTY_FILES: FileInfo[] = [];

type AdvancedSettingsProps = {
    componentId: AvailableScreens;
    isDevMode: boolean;
};
const AdvancedSettings = ({
    componentId,
    isDevMode,
}: AdvancedSettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [dataSize, setDataSize] = useState<number | undefined>(0);
    const [files, setFiles] = useState<FileInfo[]>(EMPTY_FILES);
    const styles = getStyleSheet(theme);

    const getAllCachedFiles = async () => {
        const {totalSize = 0, files: cachedFiles} = await getAllFilesInCachesDirectory(serverUrl);
        setDataSize(totalSize);
        setFiles(cachedFiles || EMPTY_FILES);
    };

    const onPressDeleteData = preventDoubleTap(async () => {
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
    });

    const onPressComponentLibrary = () => {
        const screen = Screens.COMPONENT_LIBRARY;
        const title = intl.formatMessage({id: 'settings.advanced_settings.component_library', defaultMessage: 'Component library'});

        goToScreen(screen, title);
    };

    useEffect(() => {
        getAllCachedFiles();
    }, []);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const hasData = Boolean(dataSize && dataSize > 0);

    return (
        <SettingContainer testID='advanced_settings'>
            <TouchableOpacity
                onPress={onPressDeleteData}
                disabled={!hasData}
                activeOpacity={hasData ? 1 : 0}
            >
                <SettingOption
                    containerStyle={styles.itemStyle}
                    destructive={true}
                    icon='trash-can-outline'
                    info={getFormattedFileSize(dataSize || 0)}
                    label={intl.formatMessage({id: 'settings.advanced.delete_data', defaultMessage: 'Delete local files'})}
                    testID='advanced_settings.delete_data.option'
                    type='none'
                />
                <SettingSeparator/>
            </TouchableOpacity>
            {isDevMode && (
                <TouchableOpacity
                    onPress={onPressComponentLibrary}
                >
                    <SettingOption
                        containerStyle={styles.itemStyle}
                        label={intl.formatMessage({id: 'settings.advanced.component_library', defaultMessage: 'Component library'})}
                        testID='advanced_settings.component_library.option'
                        type='none'
                    />
                    <SettingSeparator/>
                </TouchableOpacity>
            )}
        </SettingContainer>
    );
};

export default AdvancedSettings;
