// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';

import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {navigateToSettingsScreen} from '@screens/navigation';

type ReportProblemProps = {
    allowDownloadLogs?: boolean;
    reportAProblemType?: string;
}

const messages = defineMessages({
    downloadLogs: {id: 'report_problem.download_logs.title', defaultMessage: 'Download app logs'},
    reportProblem: {id: 'report_problem.title', defaultMessage: 'Report a problem'},
});

const ReportProblem = ({
    allowDownloadLogs,
    reportAProblemType,
}: ReportProblemProps) => {
    const intl = useIntl();

    // When the admin hides the report action there is nothing to report to, but the screen is
    // still useful to get to the app logs.
    const onlyAllowLogs = allowDownloadLogs && reportAProblemType === 'hidden';

    const onPress = useCallback(() => {
        const message = onlyAllowLogs ? messages.downloadLogs : messages.reportProblem;
        const title = intl.formatMessage(message);
        navigateToSettingsScreen(Screens.REPORT_PROBLEM, {title});
    }, [intl, onlyAllowLogs]);

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
