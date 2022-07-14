// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, TouchableOpacity} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {deleteFileCache, getAllFilesInCachesDirectory, getFormattedFileSize} from '@utils/file';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {ReadDirItem} from 'react-native-fs';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        screen: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        body: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
        itemStyle: {
            backgroundColor: theme.centerChannelBg,
            paddingHorizontal: 8,
        },
    };
});

const EMPTY_FILES: ReadDirItem[] = [];
const EMPTY_SERVERS: string[] = [];
const EDGES: Edge[] = ['left', 'right'];

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
        <SafeAreaView
            edges={EDGES}
            style={styles.screen}
            testID='settings_display.screen'
        >
            <View
                style={styles.body}
            >
                <TouchableOpacity
                    onPress={onPressDeleteData}
                    disabled={disabled}
                    activeOpacity={disabled ? 0 : 1}
                >
                    <OptionItem
                        containerStyle={styles.itemStyle}
                        destructive={true}
                        label={intl.formatMessage({id: 'advanced_settings.delete_data', defaultMessage: 'Delete Documents & Data'})}
                        info={getFormattedFileSize(dataSize || 0)}
                        type='none'
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default AdvancedSettings;
