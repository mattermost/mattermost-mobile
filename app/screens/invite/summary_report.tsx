// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import UserItem from '@components/user_item';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {typography} from '@utils/typography';

import TextItem, {TextItemType} from './text_item';

import type {SearchResult, InviteResult} from './invite';

const COLOR_SUCCESS = '#3db887';
const COLOR_ERROR = '#d24b4e';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            display: 'flex',
            flexDirection: 'column',
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            borderRadius: 4,
            marginBottom: 16,
            paddingVertical: 8,
        },
        title: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
        },
        titleText: {
            marginLeft: 12,
            ...typography('Heading', 300, 'SemiBold'),
            color: theme.centerChannelColor,
        },
        item: {
            display: 'flex',
            flexDirection: 'column',
            paddingVertical: 12,
        },
        reason: {
            paddingLeft: 56,
            paddingRight: 20,
            ...typography('Body', 75, 'Regular'),
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
    };
});

export enum SummaryReportType {
    SENT = 'sent',
    NOT_SENT = 'not_sent',
}

type SummaryReportProps = {
    type: SummaryReportType;
    invites: InviteResult[];
    selectedIds: {[id: string]: SearchResult};
    testID: string;
}

export default function SummaryReport({
    type,
    invites,
    selectedIds,
    testID,
}: SummaryReportProps) {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const count = invites.length;

    const sent = type === SummaryReportType.SENT;
    const message = sent ? (
        formatMessage(
            {
                id: 'invite.summary.report.sent',
                defaultMessage: '{count} successful {count, plural, one {invitation} other {invitations}}',
            },
            {count},
        )
    ) : (
        formatMessage(
            {
                id: 'invite.summary.report.notSent',
                defaultMessage: '{count} {count, plural, one {invitation} other {invitations}} not sent',
            },
            {count},
        )
    );

    return (
        <View
            style={styles.container}
            testID={`${testID}.${type}`}
        >
            <View style={styles.title}>
                <CompassIcon
                    name={sent ? 'check-circle' : 'close-circle'}
                    size={24}
                    style={{color: sent ? COLOR_SUCCESS : COLOR_ERROR}}
                />
                <Text style={styles.titleText}>
                    {message}
                </Text>
            </View>
            {invites.map(({userId, reason}) => {
                const item = secureGetFromRecord(selectedIds, userId);

                return (
                    <View
                        key={userId}
                        style={styles.item}
                    >
                        {typeof item === 'string' ? (
                            <TextItem
                                text={item}
                                type={TextItemType.SUMMARY}
                                testID={`${testID}.text_item`}
                            />
                        ) : (
                            <UserItem
                                user={item}
                                testID={`${testID}.user_item`}
                            />
                        )}
                        <Text style={styles.reason}>
                            {reason}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}
