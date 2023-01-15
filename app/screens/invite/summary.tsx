// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, ScrollView} from 'react-native';
import Button from 'react-native-button';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import AlertSvg from '@components/illustrations/alert';
import ErrorSvg from '@components/illustrations/error';
import SuccessSvg from '@components/illustrations/success';
import {useTheme} from '@context/theme';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

import {SearchResult, Result} from './invite';
import SummaryReport, {SummaryReportType} from './summary_report';

const MAX_WIDTH_CONTENT = 480;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            display: 'flex',
            flex: 1,
        },
        summary: {
            display: 'flex',
            flex: 1,
        },
        summaryContainer: {
            flexGrow: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            alignSelf: 'center',
            marginTop: 20,
            marginHorizontal: 20,
            paddingBottom: 20,
            maxWidth: MAX_WIDTH_CONTENT,
        },
        summarySvg: {
            marginBottom: 20,
            alignSelf: 'center',
        },
        summaryMessageText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 700, 'SemiBold'),
            textAlign: 'center',
            marginHorizontal: 32,
            marginBottom: 24,
        },
        summaryErrorText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 200, 'Regular'),
            textAlign: 'center',
        },
        footer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.16),
            padding: 20,
        },
        summaryButtonContainer: {
            flexGrow: 1,
            maxWidth: MAX_WIDTH_CONTENT,
        },
        summaryButtonTextContainer: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            height: 24,
        },
        summaryButtonIcon: {
            marginRight: 7,
            color: theme.buttonColor,

        },
    };
});

type SummaryProps = {
    result: Result;
    selectedIds: {[id: string]: SearchResult};
    error?: string;
    testID: string;
    onClose: () => void;
    onRetry: () => void;
}

export default function Summary({
    result,
    selectedIds,
    error,
    testID,
    onClose,
    onRetry,
}: SummaryProps) {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {sent, notSent} = result;
    const sentCount = sent.length;
    const notSentCount = notSent.length;

    const styleButtonText = buttonTextStyle(theme, 'lg', 'primary');
    const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');
    const styleSummaryMessageText = useMemo(() => {
        const style = [];

        style.push(styles.summaryMessageText);

        if (error) {
            style.push({marginBottom: 8});
        }

        return style;
    }, [error, styles]);

    let svg = <></>;
    let message = '';

    if (error) {
        svg = <ErrorSvg/>;
        message = formatMessage(
            {
                id: 'invite.summary.error',
                defaultMessage: '{invitationsCount, plural, one {Invitation} other {Invitations}} could not be sent successfully',
            },
            {invitationsCount: sentCount + notSentCount},
        );
    } else if (!sentCount && notSentCount) {
        svg = <ErrorSvg/>;
        message = formatMessage(
            {
                id: 'invite.summary.not_sent',
                defaultMessage: '{notSentCount, plural, one {Invitation wasn’t} other {Invitations weren’t}} sent',
            },
            {notSentCount},
        );
    } else if (sentCount && !notSentCount) {
        svg = <SuccessSvg/>;
        message = formatMessage(
            {
                id: 'invite.summary.sent',
                defaultMessage: 'Your {sentCount, plural, one {invitation has} other {invitations have}} been sent',
            },
            {sentCount},
        );
    } else if (sentCount && notSentCount) {
        svg = <AlertSvg/>;
        message = formatMessage(
            {
                id: 'invite.summary.some_not_sent',
                defaultMessage: '{notSentCount, plural, one {An invitation was} other {Some invitations were}} not sent',
            },
            {notSentCount},
        );
    }

    const handleOnPressButton = useCallback(() => {
        if (error) {
            onRetry();
            return;
        }

        onClose();
    }, [error, onRetry, onClose]);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <ScrollView
                style={styles.summary}
                contentContainerStyle={styles.summaryContainer}
                testID='invite.summary'
            >
                <View style={styles.summarySvg}>
                    {svg}
                </View>
                <Text style={styleSummaryMessageText}>
                    {message}
                </Text>
                {error ? (
                    <Text style={styles.summaryErrorText}>
                        {error}
                    </Text>
                ) : (
                    <>
                        <SummaryReport
                            type={SummaryReportType.NOT_SENT}
                            invites={notSent}
                            selectedIds={selectedIds}
                            testID='invite.summary_report'
                        />
                        <SummaryReport
                            type={SummaryReportType.SENT}
                            invites={sent}
                            selectedIds={selectedIds}
                            testID='invite.summary_report'
                        />
                    </>
                )}
            </ScrollView>
            <View style={styles.footer}>
                <View style={styles.summaryButtonContainer}>
                    <Button
                        containerStyle={styleButtonBackground}
                        onPress={handleOnPressButton}
                        testID='invite.summary_button'
                    >
                        {error ? (
                            <View style={styles.summaryButtonTextContainer}>
                                <CompassIcon
                                    name='refresh'
                                    size={24}
                                    style={styles.summaryButtonIcon}
                                />
                                <FormattedText
                                    id='invite.summary.try_again'
                                    defaultMessage='Try again'
                                    style={styleButtonText}
                                />
                            </View>
                        ) : (
                            <FormattedText
                                id='invite.summary.done'
                                defaultMessage='Done'
                                style={styleButtonText}
                            />
                        )}
                    </Button>
                </View>
            </View>
        </View>
    );
}
