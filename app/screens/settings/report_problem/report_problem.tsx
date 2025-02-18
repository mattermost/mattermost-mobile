// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {shareLogs} from '@utils/share_logs';

import type {ReportAProblemMetadata} from '@typings/screens/report_a_problem';

type ReportProblemProps = {
    allowDownloadLogs?: boolean;
    reportAProblemMail?: string;
    reportAProblemType?: string;
    siteName?: string;
    metadata: ReportAProblemMetadata;
}

const ReportProblem = ({
    allowDownloadLogs,
    reportAProblemMail,
    reportAProblemType,
    siteName,
    metadata,
}: ReportProblemProps) => {
    const theme = useTheme();
    const intl = useIntl();

    const onPress = useCallback(() => {
        if (allowDownloadLogs || reportAProblemType !== 'email') {
            const title = intl.formatMessage({id: 'report_problem.title', defaultMessage: 'Report a problem'});
            goToScreen(Screens.REPORT_PROBLEM, title);
        } else {
            shareLogs(metadata, siteName, reportAProblemMail, true);
        }
    }, [allowDownloadLogs, intl, metadata, reportAProblemMail, reportAProblemType, siteName]);

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
