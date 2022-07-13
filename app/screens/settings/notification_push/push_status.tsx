// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SettingBlock from '../setting_block';
import SettingSeparator from '../settings_separator';

const headerText = {
    id: t('notification_settings.mobile.push_status'),
    defaultMessage: 'Trigger push notifications when',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
        },
        container: {
            paddingHorizontal: 20,
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
        <SettingBlock
            headerText={headerText}
        >
            <OptionItem
                action={setMobilePushStatus}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.mobile.online', defaultMessage: 'Online, away or offline'})}
                selected={pushStatus === 'online'}
                type='select'
                value='online'
            />
            <SettingSeparator/>
            <OptionItem
                action={setMobilePushStatus}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.mobile.away', defaultMessage: 'Away or offline'})}
                selected={pushStatus === 'away'}
                type='select'
                value='away'
            />
            <SettingSeparator/>
            <OptionItem
                action={setMobilePushStatus}
                containerStyle={styles.container}
                label={intl.formatMessage({id: 'notification_settings.mobile.offline', defaultMessage: 'Offline'})}
                selected={pushStatus === 'offline'}
                type='select'
                value='offline'
            />
        </SettingBlock>
    );
};

export default MobilePushStatus;
