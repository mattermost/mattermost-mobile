// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import TurboLogger from '@mattermost/react-native-turbo-log';
import RNUtils from '@mattermost/rnutils';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, ActivityIndicator, Platform} from 'react-native';
import Share from 'react-native-share';

import Button from '@components/button';
import {useTheme} from '@context/theme';
import {deleteFile, pathWithPrefix} from '@utils/file';
import {logDebug} from '@utils/log';
import {makeStyleSheetFromTheme} from '@utils/theme';

import LogFileItem from './log_file_item';
import {getCommonStyleSheet} from './styles';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    ...getCommonStyleSheet(theme),

    buttonContainer: {
        alignItems: 'flex-start',
    },
    container: {
        gap: 16,
    },
}));

const AppLogs = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const [logFiles, setLogFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const paths = await TurboLogger.getLogPaths();
                setLogFiles(paths);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const handleDownload = useCallback(async () => {
        let zipFilePath = '';
        try {
            zipFilePath = await RNUtils.createZipFile(logFiles);
            if (Platform.OS === 'android') {
                await RNUtils.saveFile(zipFilePath);
            } else {
                await Share.open({
                    url: pathWithPrefix('file://', zipFilePath),
                    saveToFiles: true,
                });
            }
        } catch (error) {
            logDebug('Failed to create save file', error);
        }

        if (zipFilePath) {
            try {
                await deleteFile(zipFilePath);
            } catch (error) {
                logDebug('Failed to delete zip file', error);
            }
        }
    }, [logFiles]);

    const hasLogs = logFiles.length > 0;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>
                {intl.formatMessage({
                    id: 'screen.report_problem.logs.title',
                    defaultMessage: 'APP LOGS:',
                })}
            </Text>
            <View>
                {isLoading ? (
                    <ActivityIndicator
                        testID='logs-loading'
                        color={theme.buttonBg}
                        size='large'
                    />
                ) : (hasLogs && (
                    <LogFileItem/>
                ))}
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    onPress={handleDownload}
                    text={intl.formatMessage({
                        id: 'screen.report_problem.logs.download',
                        defaultMessage: 'Download App Logs',
                    })}
                    emphasis='tertiary'
                    theme={theme}
                    iconName='download-outline'
                    disabled={!hasLogs}
                />
            </View>
        </View>
    );
};

export default AppLogs;
