// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import Button from '@components/button';
import MenuDivider from '@components/menu_divider';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {logDebug} from '@utils/log';
import {getDefaultReportAProblemLink, shareLogs} from '@utils/share_logs';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {tryOpenURL} from '@utils/url';

import AppLogs from './app_logs';
import CopyMetadata from './copy_metadata';
import {getCommonStyleSheet} from './styles';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {ReportAProblemMetadata} from '@typings/screens/report_a_problem';
export const REPORT_PROBLEM_CLOSE_BUTTON_ID = 'close-report-problem';

type Props = {
    componentId: AvailableScreens;
    reportAProblemMail?: string;
    reportAProblemLink?: string;
    siteName?: string;
    allowDownloadLogs: boolean;
    reportAProblemType?: string;
    isLicensed: boolean;
    metadata: ReportAProblemMetadata;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    ...getCommonStyleSheet(theme),
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
        padding: 20,
        gap: 20,
    },
    content: {
        gap: 16,
    },
    detailsTitle: {
        ...typography('Heading', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    detailsSection: {
        gap: 8,
    },
    buttonContainer: {
        marginTop: 'auto',
    },
}));

const ReportProblem = ({
    componentId,
    reportAProblemMail,
    reportAProblemLink,
    siteName,
    allowDownloadLogs,
    reportAProblemType,
    isLicensed,
    metadata,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const handleReport = useCallback(async () => {
        switch (reportAProblemType) {
            case 'email':
                await shareLogs(metadata, siteName, reportAProblemMail, !allowDownloadLogs);
                return;
            case 'link':
                if (!reportAProblemLink) {
                    logDebug('Report a problem link is not set');
                    return;
                }
                tryOpenURL(reportAProblemLink);
                return;
            case 'default': {
                tryOpenURL(getDefaultReportAProblemLink(isLicensed));
                return;
            }
        }

        // Old servers where reportAProblemType is not defined
        if (!reportAProblemLink) {
            await shareLogs(metadata, siteName, undefined, false);
            return;
        }

        tryOpenURL(reportAProblemLink);
    }, [reportAProblemType, reportAProblemLink, reportAProblemMail, metadata, siteName, allowDownloadLogs, isLicensed]);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);
    useAndroidHardwareBackHandler(componentId, close);

    const descriptionText = allowDownloadLogs ? intl.formatMessage({
        id: 'screen.report_problem.details.description',
        defaultMessage: 'When reporting a problem, share the metadata and app logs given below to help troubleshoot your problem faster',
    }) : intl.formatMessage({
        id: 'screen.report_problem.details.description_without_logs',
        defaultMessage: 'When reporting a problem, share the metadata given below to help troubleshoot your problem faster',
    });

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.detailsSection}>
                    <Text style={styles.detailsTitle}>
                        {intl.formatMessage({
                            id: 'screen.report_problem.details.title',
                            defaultMessage: 'Troubleshouting details',
                        })}
                    </Text>
                    <Text style={styles.bodyText}>
                        {descriptionText}
                    </Text>
                </View>
                <MenuDivider/>
                <CopyMetadata metadata={metadata}/>
                {allowDownloadLogs && (
                    <>
                        <MenuDivider/>
                        <AppLogs/>
                    </>
                )}
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    theme={theme}
                    text={intl.formatMessage({
                        id: 'screen.report_problem.button',
                        defaultMessage: 'Report a problem',
                    })}
                    onPress={handleReport}
                    iconName='open-in-new'
                    iconSize={20}
                    size='lg'
                    isIconOnTheRight={true}
                />
            </View>
        </View>
    );
};

export default ReportProblem;
