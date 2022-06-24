// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {getAllFilesInCachesDirectory} from '@actions/local/file';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {deleteFileCache, getFormattedFileSize} from '@utils/file';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ReadDirItem} from 'react-native-fs';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        containerStyle: {
            backgroundColor: theme.centerChannelBg,
            height: 48,
        },
        fileSize: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        iconContainerStyle: {
            height: '100%',
        },
        rightComponent: {
            justifyContent: 'center',
            height: '100%',
            marginRight: 10,
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
    const [dataSize, setDataSize] = useState<number|undefined>(0);
    const [files, setFiles] = useState<ReadDirItem[]>(EMPTY_FILES);
    const [serverUrls, setServerUrls] = useState<string[]>(EMPTY_SERVERS);
    const styles = getStyleSheet(theme);

    const getAllCachedFiles = useCallback(async () => {
        const {totalSize, files: cachedFiles, serverUrls: allServerUrls} = await getAllFilesInCachesDirectory();
        setDataSize(totalSize);
        setFiles(cachedFiles || EMPTY_FILES);
        setServerUrls(allServerUrls || EMPTY_SERVERS);
    }, []);

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

    const renderFileSize = useCallback(() => {
        return (
            <View
                style={styles.rightComponent}
            >
                <Text
                    style={styles.fileSize}
                >
                    {getFormattedFileSize(dataSize || 0)}
                </Text>
            </View>
        );
    }, [dataSize, theme.centerChannelColor]);

    const close = () => popTopScreen(componentId);
    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={EDGES}
            style={styles.container}
            testID='settings_display.screen'
        >
            <View
                style={styles.wrapper}
            >
                <MenuItem
                    containerStyle={styles.containerStyle}
                    defaultMessage='Delete Documents & Data'
                    i18nId='advanced_settings.delete_data'
                    iconContainerStyle={styles.iconContainerStyle}
                    iconName='trash-can-outline'
                    isDestructor={true}
                    onPress={onPressDeleteData}
                    rightComponent={renderFileSize()}
                    separator={false}
                    showArrow={false}
                    testID='advanced_settings.delete_data'
                    theme={theme}
                />
            </View>
        </SafeAreaView>
    );
};

export default AdvancedSettings;
