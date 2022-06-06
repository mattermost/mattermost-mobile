// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Block from '@components/block';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const headerText = {
    id: t('notification_settings.mobile.push_status'),
    defaultMessage: 'Trigger push notifications when',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        upperCase: {
            textTransform: 'uppercase',
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),

        },
        container: {
            paddingHorizontal: 8,
        },
    };
});

type MobilePushStatusProps = {
    pushStatus: PushStatus;
    setMobilePushStatus: (status: PushStatus) => void;
}
const MobilePushStatus = ({pushStatus, setMobilePushStatus}: MobilePushStatusProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    return (
        <Block
            headerText={headerText}
            headerStyles={styles.upperCase}
        >
            <OptionItem
                action={setMobilePushStatus}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.mobile.online', defaultMessage: 'Online, away or offline'})}
                selected={pushStatus === 'online'}
                type='select'
                value='online'
            />
            <View style={styles.separator}/>
            <OptionItem
                action={setMobilePushStatus}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.mobile.away', defaultMessage: 'Away or offline'})}
                selected={pushStatus === 'away'}
                type='select'
                value='away'
            />
            <View style={styles.separator}/>
            <OptionItem
                action={setMobilePushStatus}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.mobile.offline', defaultMessage: 'Offline'})}
                selected={pushStatus === 'offline'}
                type='select'
                value='offline'
            />
        </Block>
    );
};

export default MobilePushStatus;
