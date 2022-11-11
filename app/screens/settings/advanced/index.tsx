// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, TouchableOpacity} from 'react-native';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import SettingSeparator from '@screens/settings/settings_separator';
import {
    deleteFileCache,
    getAllFilesInCachesDirectory,
    getFormattedFileSize,
} from '@utils/file';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';

import SettingContainer from '../setting_container';
import SettingOption from '../setting_option';

import type {ReadDirItem} from 'react-native-fs';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        itemStyle: {
            backgroundColor: theme.centerChannelBg,
            paddingHorizontal: 20,
        },
    };
});

const EMPTY_FILES: ReadDirItem[] = [];

type AdvancedSettingsProps = {
    componentId: string;
};
const AdvancedSettings = ({componentId}: AdvancedSettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [dataSize, setDataSize] = useState<number | undefined>(0);
    const [files, setFiles] = useState<ReadDirItem[]>(EMPTY_FILES);
    const styles = getStyleSheet(theme);

    const getAllCachedFiles = useCallback(async () => {
        const {totalSize = 0, files: cachedFiles} =
            await getAllFilesInCachesDirectory(serverUrl);
        setDataSize(totalSize);
        setFiles(cachedFiles || EMPTY_FILES);
    }, [serverUrl]);

    const onPressDeleteData = preventDoubleTap(async () => {
        try {
            if (files.length > 0) {
                const {formatMessage} = intl;

                Alert.alert(
                    formatMessage({
                        id: t('advanced_settings.delete_data'),
                        defaultMessage: 'Delete Documents & Data',
                    }),
                    formatMessage({
                        id: t('mobile.advanced_settings.delete_message.confirmation'),
                        defaultMessage: '\nThis will delete all offline data downloaded through the app. Please confirm to proceed.\n',
                    }),
                    [
                        {
                            text: formatMessage({id: 'channel_modal.cancel', defaultMessage: 'Cancel'}),
                            style: 'cancel',
                            onPress: () => true,
                        },
                        {
                            text: formatMessage({id: 'mobile.advanced_settings.delete', defaultMessage: 'Delete'}),
                            style: 'destructive',
                            onPress: async () => {
                                await deleteFileCache(serverUrl);
                                await getAllCachedFiles();
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

    useEffect(() => {
        getAllCachedFiles();
    }, []);

    const close = () => popTopScreen(componentId);
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
                    label={intl.formatMessage({
                        id: 'advanced_settings.delete_data',
                        defaultMessage: 'Delete Documents & Data',
                    })}
                    testID='advanced_settings.delete_data.option'
                    type='none'
                />
                <SettingSeparator/>
            </TouchableOpacity>
        </SettingContainer>
    );
};

export default AdvancedSettings;
