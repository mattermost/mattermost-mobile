// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity} from 'react-native';

import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import SettingSeparator from '@screens/settings/settings_separator';
import {deleteFileCache, getAllFilesInCachesDirectory, getFormattedFileSize} from '@utils/file';
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
const EMPTY_SERVERS: string[] = [];

type AdvancedSettingsProps = {
    componentId: string;
}
const AdvancedSettings = ({componentId}: AdvancedSettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const [dataSize, setDataSize] = useState<number|undefined>(0);
    const [files, setFiles] = useState<ReadDirItem[]>(EMPTY_FILES);
    const [serverUrls, setServerUrls] = useState<string[]>(EMPTY_SERVERS);
    const styles = getStyleSheet(theme);

    const getAllCachedFiles = async () => {
        const {totalSize, files: cachedFiles, serverUrls: allServerUrls} = await getAllFilesInCachesDirectory();
        setDataSize(totalSize);
        setFiles(cachedFiles || EMPTY_FILES);
        setServerUrls(allServerUrls || EMPTY_SERVERS);
    };

    const onPressDeleteData = preventDoubleTap(async () => {
        try {
            if (files.length > 0) {
                const deletePromises = [];
                for (const server of serverUrls) {
                    deletePromises.push(deleteFileCache(server));
                }
                await Promise.all(deletePromises);
            }
            await getAllCachedFiles();
        } catch (e) {
            //todo: show toast if error https://mattermost.atlassian.net/browse/MM-44926
        }
    });

    useEffect(() => {
        getAllCachedFiles();
    }, []);

    const close = () => popTopScreen(componentId);
    useAndroidHardwareBackHandler(componentId, close);

    const disabled = Boolean(dataSize && (dataSize > 0));

    return (
        <SettingContainer>
            <TouchableOpacity
                onPress={onPressDeleteData}
                disabled={disabled}
                activeOpacity={disabled ? 0 : 1}
            >
                <SettingOption
                    containerStyle={styles.itemStyle}
                    destructive={true}
                    icon='trash-can-outline'
                    info={getFormattedFileSize(dataSize || 0)}
                    label={intl.formatMessage({id: 'advanced_settings.delete_data', defaultMessage: 'Delete Documents & Data'})}
                    type='none'
                />
                <SettingSeparator/>
            </TouchableOpacity>
        </SettingContainer>
    );
};

export default AdvancedSettings;
