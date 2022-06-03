// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        upperCase: {
            textTransform: 'uppercase',
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
            marginLeft: 15,
        },
        area: {
            paddingHorizontal: 16,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
    };
});

const headerText = {
    id: t('notification_settings.push_threads'),
    defaultMessage: 'Thread reply notifications',
};
const footerText = {
    id: t('notification_settings.push_threads.info'),
    defaultMessage: 'When enabled, any reply to a thread you\'re following will send a mobile push notification',
};

type MobilePushThreadProps = {
    onMobilePushThreadChanged: (status: string) => void;
    pushThread: PushStatus;
}

const MobilePushThread = ({pushThread, onMobilePushThreadChanged}: MobilePushThreadProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <Block
            headerText={headerText}
            footerText={footerText}
            headerStyles={styles.upperCase}
            containerStyles={styles.area}
        >
            <BlockItem
                label={(
                    <FormattedText
                        id='notification_settings.push_threads.description'
                        defaultMessage={'Notify me about all replies to threads I\'m following'}
                        style={styles.label}
                    />
                )}
                action={onMobilePushThreadChanged}
                actionType='toggle'
                selected={pushThread === 'all'}
            />
            <View style={styles.separator}/>
        </Block>
    );
};

export default MobilePushThread;
