// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {DEFAULT_REPORT_A_PROBLEM_EMAIL} from '@constants/report_a_problem';
import {goToScreen} from '@screens/navigation';
import {emailLogs, getDefaultReportAProblemLink} from '@utils/share_logs';
import {tryOpenURL} from '@utils/url';

import type {ReportAProblemMetadata} from '@typings/screens/report_a_problem';

type ReportProblemProps = {
    allowDownloadLogs?: boolean;
    isFreeEdition?: boolean;
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
    isFreeEdition,
    reportAProblemMail,
    reportAProblemType,
    siteName,
    metadata,
}: ReportProblemProps) => {
    const intl = useIntl();
    const onlyAllowLogs = allowDownloadLogs && reportAProblemType === 'hidden';
    const skipReportAProblemScreen =
        (reportAProblemType === 'email' && !allowDownloadLogs) ||
        (reportAProblemType === 'default' && isFreeEdition === true) ||
        (reportAProblemType === 'default' && isFreeEdition === false && !allowDownloadLogs);

    const onPress = useCallback(() => {
        if (skipReportAProblemScreen) {
            if (reportAProblemType === 'default' && isFreeEdition) {
                tryOpenURL(getDefaultReportAProblemLink(false));
            } else {
                const mail = reportAProblemType === 'default' ? DEFAULT_REPORT_A_PROBLEM_EMAIL : reportAProblemMail;
                emailLogs(metadata, siteName, mail, !allowDownloadLogs);
            }
            return;
        }
        const message = onlyAllowLogs ? messages.downloadLogs : messages.reportProblem;
        const title = intl.formatMessage(message);
        goToScreen(Screens.REPORT_PROBLEM, title);
    }, [allowDownloadLogs, intl, isFreeEdition, metadata, onlyAllowLogs, reportAProblemMail, reportAProblemType, siteName, skipReportAProblemScreen]);

    if (onlyAllowLogs) {
        return (
            <SettingItem
                onPress={onPress}
                optionName='download_logs'
                separator={false}
                testID='settings.download_logs.option'
                type='link'
            />
        );
    }

    if (reportAProblemType === 'hidden') {
        return null;
    }

    return (
        <SettingItem
            onPress={onPress}
            optionName='report_problem'
            separator={false}
            testID='settings.report_problem.option'
            type='link'
        />
    );
};

export default ReportProblem;
