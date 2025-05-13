// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import TurboLogger from '@mattermost/react-native-turbo-log';
import {defineMessages} from 'react-intl';
import {Alert, Platform} from 'react-native';
import Share from 'react-native-share';

import {pathWithPrefix} from '@utils/file';

import {tryOpenURL} from './url';

import type {ReportAProblemMetadata} from '@typings/screens/report_a_problem';

export const shareLogs = async (metadata: ReportAProblemMetadata, siteName: string | undefined, reportAProblemMail: string | undefined, excludeLogs: boolean = false) => {
    try {
        const logPaths = await TurboLogger.getLogPaths();
        const attachments = excludeLogs ? [] : logPaths.map((path) => pathWithPrefix('file://', path));
        await Share.open({
            subject: `Problem with ${siteName} React Native app`,
            email: reportAProblemMail,
            failOnCancel: false,
            urls: attachments.length ? attachments : undefined,
            message: [
                'Please share a description of the problem:\n\n',
                metadataToString(metadata),
            ].join('\n'),
        });
    } catch (e: unknown) {
        Alert.alert('Error', `${e}`);
    }
};

export const emailLogs = async (metadata: ReportAProblemMetadata, siteName: string | undefined, reportAProblemMail: string | undefined, excludeLogs: boolean = false) => {
    try {
        if (Platform.OS === 'ios') {
            // iOS does not support sharing with different mail apps, so we use a mailto link

            const subject = `Problem with ${siteName || 'Mattermost'} React Native app`;
            const body = metadataToString(metadata);
            const url = `mailto:${reportAProblemMail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            tryOpenURL(url);
            return;
        }
        const logPaths = await TurboLogger.getLogPaths();
        const attachments = excludeLogs ? [] : logPaths.map((path) => pathWithPrefix('file://', path));
        await Share.shareSingle({
            social: Share.Social.EMAIL as any, // The type is not correct in the library
            subject: `Problem with ${siteName} React Native app`,
            email: reportAProblemMail,
            urls: attachments.length ? attachments : undefined,
            message: [
                'Please share a description of the problem:\n\n',
                metadataToString(metadata),
            ].join('\n'),
        });
    } catch (e: unknown) {
        Alert.alert('Error', `${e}`);
    }
};

export const getDefaultReportAProblemLink = (isLicensed: boolean) => {
    return isLicensed ? 'https://mattermost.com/pl/report_a_problem_licensed' : 'https://mattermost.com/pl/report_a_problem_unlicensed';
};

export function metadataToString(metadata: ReportAProblemMetadata): string {
    return Object.entries(metadata).
        map(([key, value]) => `${reportAProblemMessages[key as keyof ReportAProblemMetadata].defaultMessage}: ${value}`).
        join('\n');
}

export const reportAProblemMessages = defineMessages({
    currentUserId: {
        id: 'report_a_problem.metadata.currentUserId',
        defaultMessage: 'Current User ID',
    },
    currentTeamId: {
        id: 'report_a_problem.metadata.currentTeamId',
        defaultMessage: 'Current Team ID',
    },
    serverVersion: {
        id: 'report_a_problem.metadata.serverVersion',
        defaultMessage: 'Server Version',
    },
    appVersion: {
        id: 'report_a_problem.metadata.appVersion',
        defaultMessage: 'App Version',
    },
    appPlatform: {
        id: 'report_a_problem.metadata.appPlatform',
        defaultMessage: 'App Platform',
    },
});
