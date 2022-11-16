// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import React from 'react';
import {Platform, Alert} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Mailer from 'react-native-mail';

import {preventDoubleTap} from '@app/utils/tap';
import {useTheme} from '@context/theme';

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
        console.log('>>>  log path ', logPaths[0]); // /data/user/0/com.mattermost.rnbeta/cache/logs/com.mattermost.rnbeta-latest.log

        const attachments = logPaths.map((path) => {
            return {
                uri: path,
                type: 'text',
            };
        });
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
