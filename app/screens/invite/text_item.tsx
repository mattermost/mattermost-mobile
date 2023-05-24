// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        item: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
        },
        search: {
            height: 40,
            paddingVertical: 8,
        },
        itemText: {
            display: 'flex',
            ...typography('Body', 200, 'Regular'),
            color: theme.centerChannelColor,
        },
        itemTerm: {
            display: 'flex',
            ...typography('Body', 200, 'SemiBold'),
            color: theme.centerChannelColor,
            marginLeft: 4,
        },
        itemImage: {
            alignItems: 'center',
            justifyContent: 'center',
            height: 24,
            width: 24,
            borderRadius: 12,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            marginRight: 12,
        },
        itemIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
    };
});

export enum TextItemType {
    SEARCH_INVITE = 'search_invite',
    SEARCH_NO_RESULTS = 'search_no_results',
    SUMMARY = 'summary',
}

type TextItemProps = {
    text?: string;
    type: TextItemType;
    testID: string;
}

export default function TextItem({
    text = '',
    type,
    testID,
}: TextItemProps) {
    const {formatMessage} = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const search = type === TextItemType.SEARCH_INVITE || type === TextItemType.SEARCH_NO_RESULTS;
    const email = type === TextItemType.SEARCH_INVITE || type === TextItemType.SUMMARY;

    return (
        <View
            style={[styles.item, search ? styles.search : {}]}
            testID={`${testID}.${text}`}
        >
            {email && (
                <View style={styles.itemImage}>
                    <CompassIcon
                        name={search ? 'email-plus-outline' : 'email-outline'}
                        size={14}
                        style={styles.itemIcon}
                    />
                </View>)
            }
            {search && (
                <Text
                    style={styles.itemText}
                    numberOfLines={1}
                >
                    {email ? (
                        formatMessage({id: 'invite.search.email_invite', defaultMessage: 'invite'})
                    ) : (
                        formatMessage({id: 'invite.search.no_results', defaultMessage: 'No one found matching'})
                    )}
                </Text>
            )}
            <Text
                style={[search ? styles.itemTerm : styles.itemText, {flex: 1}]}
                numberOfLines={1}
                testID={`${testID}.text.${text}`}
            >
                {text}
            </Text>
        </View>
    );
}
