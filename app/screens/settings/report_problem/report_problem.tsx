// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {emailLogs} from '@utils/share_logs';

import type {ReportAProblemMetadata} from '@typings/screens/report_a_problem';

type ReportProblemProps = {
    allowDownloadLogs?: boolean;
    reportAProblemMail?: string;
    reportAProblemType?: string;
    siteName?: string;
    metadata: ReportAProblemMetadata;
}

const messages = defineMessages({
    downloadLogs: {id: 'report_problem.download_logs.title', defaultMessage: 'Download app logs'},
    reportProblem: {id: 'report_problem.title', defaultMessage: 'Report a problem'},
});

const ReportProblem = ({
    allowDownloadLogs,
    reportAProblemMail,
    reportAProblemType,
    siteName,
    metadata,
}: ReportProblemProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const onlyAllowLogs = allowDownloadLogs && reportAProblemType === 'hidden';
    const skipReportAProblemScreen = reportAProblemType === 'email' && !allowDownloadLogs;

    const onPress = useCallback(() => {
        if (skipReportAProblemScreen) {
            emailLogs(metadata, siteName, reportAProblemMail, true);
        } else {
            const message = onlyAllowLogs ? messages.downloadLogs : messages.reportProblem;
            const title = intl.formatMessage(message);
            goToScreen(Screens.REPORT_PROBLEM, title);
        }
    }, [intl, metadata, onlyAllowLogs, reportAProblemMail, siteName, skipReportAProblemScreen]);

    if (onlyAllowLogs) {
        return (
            <SettingItem
                optionLabelTextStyle={{color: theme.linkColor}}
                onPress={onPress}
                optionName='download_logs'
                separator={false}
                testID='settings.download_logs.option'
                type='default'
            />
        );
    }

    if (reportAProblemType === 'hidden') {
        return null;
    }

    return (
        <SettingItem
            optionLabelTextStyle={{color: theme.linkColor}}
            onPress={onPress}
            optionName='report_problem'
            separator={false}
            testID='settings.report_problem.option'
            type='default'
        />
    );
};

export default ReportProblem;
