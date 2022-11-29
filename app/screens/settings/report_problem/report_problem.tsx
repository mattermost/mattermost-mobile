// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TurboLogger from '@mattermost/react-native-turbo-log';
import React from 'react';
import {Alert, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import TurboMailer from 'react-native-turbo-mailer';

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
};

const ReportProblem = ({buildNumber, currentTeamId, currentUserId, siteName, supportEmail, version}: ReportProblemProps) => {
    const theme = useTheme();

    const openEmailClient = preventDoubleTap(async () => {
        const appVersion = DeviceInfo.getVersion();
        const appBuild = DeviceInfo.getBuildNumber();
        const deviceId = DeviceInfo.getDeviceId();

        const logPaths = await TurboLogger.getLogPaths();

        const attachments = logPaths.map((path) => ({
            path,
            mimeType: 'message/rfc822',
        }));

        try {
            await TurboMailer.sendMail({
                subject: `Problem with ${siteName} React Native app`,
                recipients: [supportEmail],
                body: [
                    'Please share a description of the problem:\n\n',
                    `Current User Id: ${currentUserId}`,
                    `Current Team Id: ${currentTeamId}`,
                    `Server Version: ${version} (Build ${buildNumber})`,
                    `App Version: ${appVersion} (Build ${appBuild})`,
                    `App Platform: ${Platform.OS}`,
                    `Device Model: ${deviceId}`, // added this one
                ].join('\n'),
                attachments,
            });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
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
