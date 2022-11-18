// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import React from 'react';
import {Platform, Alert} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import FileSystem from 'react-native-fs';
import Mailer from 'react-native-mail';

import {preventDoubleTap} from '@app/utils/tap';
import {useTheme} from '@context/theme';
import {logError} from '@utils/log';

import SettingItem from '../setting_item';

type ReportProblemProps = {
    buildNumber: string;
    currentTeamId: string;
    currentUserId: string;
    supportEmail: string;
    version: string;
    siteName: string;
}

const ReportProblem = ({currentTeamId, currentUserId, supportEmail, version, buildNumber, siteName}: ReportProblemProps) => {
    const theme = useTheme();

    const openEmailClient = preventDoubleTap(async () => {
        const appVersion = DeviceInfo.getVersion();
        const appBuild = DeviceInfo.getBuildNumber();
        const deviceId = DeviceInfo.getDeviceId();

        const logPaths = await TurboLogger.getLogPaths();

        // /data/user/0/com.mattermost.rnbeta/cache/logs/com.mattermost.rnbeta-latest.log

        // copy all the logs into the downloads folder
        const docLogDir = `${FileSystem.DocumentDirectoryPath}/mattermost-logs`; // perhaps run mkdir to create the directory
        const fileNames: string[] = [];

        // creates the directory if it doesn't exist
        try {
            await FileSystem.mkdir(docLogDir, {NSURLIsExcludedFromBackupKey: true});
        } catch (e) {
            logError(`An error occurred while creating folder at ${docLogDir}`, e);
        }
        try {
            const copyPromises = logPaths.map(async (logPath) => {
                const pathParts = logPath.split('/');
                const logFileName = pathParts[pathParts.length - 1];
                fileNames.push(logFileName);
                const p = await FileSystem.copyFile(logPath, docLogDir);
                console.log('>>>  p', {p});
                return p;
            });
            const copiedFiles = await Promise.all(copyPromises);
        } catch (e) {
            logError(`An error occurred while copying logs to ${docLogDir}`, e);
        }

        const attachments = [];
        try {
            const fileStatsPromises = fileNames.map(async (fileName) => {
                const stat = await FileSystem.stat(`${docLogDir}`); // todo: check if size < 20MB
                console.log('>>>  stat', {stat});
                return attachments.push({
                    uri: `${docLogDir}/${fileName}`,
                    type: 'text/plain',
                    name: fileName,
                });
            });

            const stats = await Promise.all(fileStatsPromises);
        } catch (e) {
            logError(`An error occurred while reading logs from ${docLogDir} folder`, e);
        }

        Mailer.mail({
            subject: `Problem with ${siteName} React Native app`,

            // recipients: [supportEmail],
            recipients: ['avinash.lingaloo@mattermost.com'], //fixme:
            body: [
                'Please share a description of the problem:\n\n',
                `Current User Id: ${currentUserId}`,
                `Current Team Id: ${currentTeamId}`,
                `Server Version: ${version} (Build ${buildNumber})`,
                `App Version: ${appVersion} (Build ${appBuild})`,
                `App Platform: ${Platform.OS}`,
                `Device Model: ${deviceId}`, // added this one
            ].join('\n'),

            //fixme: include attachments
            attachments,
        }, (error, event) => {
            //fixme: error : not_available  || not_found => verify if the default email client has been configured or ask the user to do so and to try again later

            Alert.alert(
                error,
                event,
                [
                    {text: 'Ok', onPress: () => console.log('OK: Email Error Response', {error, event})},
                    {text: 'Cancel', onPress: () => console.log('CANCEL: Email Error Response')},
                ],
                {cancelable: true},
            );
        });
    });

    return (
        <SettingItem
            optionLabelTextStyle={{color: theme.linkColor}}
            onPress={openEmailClient}
            optionName='report_problem'
            separator={false}
            testID='settings.report.problem'
            type='default'
        />
    );
};

export default ReportProblem;
