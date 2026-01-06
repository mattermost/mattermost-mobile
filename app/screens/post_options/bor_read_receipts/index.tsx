// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export const BOR_READ_RECEIPTS_HEIGHT = 54;

type Props = {
    totalReceipts: number;
    readReceipts: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.16),
            paddingBottom: 16,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: BOR_READ_RECEIPTS_HEIGHT,
        },
        title: {
            fontSize: 11,
            fontWeight: 600,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
    };
});

export default function BORReadReceipts({totalReceipts, readReceipts}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View style={styles.container}>
            <FormattedText
                style={styles.title}
                id='mobile.burn_on_read.read_receipt.title'
                defaultMessage='Burn-on-read message'
            />
            <FormattedText
                id='mobile.burn_on_read.read_receipt.text'
                defaultMessage='Read by {readReceipts} of {totalReceipts} recipients'
                values={{totalReceipts, readReceipts}}
            />
        </View>
    );
}
