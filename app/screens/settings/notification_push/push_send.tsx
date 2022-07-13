// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import FormattedText from '@components/formatted_text';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import SettingBlock from '../setting_block';
import SettingSeparator from '../settings_separator';

const headerText = {
    id: t('notification_settings.send_notification'),
    defaultMessage: 'Notify me about...',
};
const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        disabled: {
            color: theme.centerChannelColor,
            paddingHorizontal: 15,
            paddingVertical: 10,
            ...typography('Body', 200, 'Regular'),
        },
        container: {
            paddingHorizontal: 20,
        },
        optionLabelTextStyle: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
            marginBottom: 4,
        },
        optionDescriptionTextStyle: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
        },
    };
});

type MobileSendPushProps = {
    sendPushNotifications: boolean;
    pushStatus: PushStatus;
    setMobilePushPref: (status: PushStatus) => void;
}
const MobileSendPush = ({sendPushNotifications, pushStatus, setMobilePushPref}: MobileSendPushProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    return (
        <SettingBlock
            headerText={headerText}
        >
            {sendPushNotifications &&
                <>
                    <OptionItem
                        action={setMobilePushPref}
                        containerStyle={styles.container}
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.allActivity', defaultMessage: 'For all activity'})}
                        selected={pushStatus === 'all'}
                        testID='notification_settings.pushNotification.allActivity'
                        type='select'
                        value='all'
                        optionDescriptionTextStyle={styles.optionDescriptionTextStyle}
                        optionLabelTextStyle={styles.optionLabelTextStyle}
                    />
                    <SettingSeparator/>
                    <OptionItem
                        action={setMobilePushPref}
                        containerStyle={styles.container}
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.onlyMentions', defaultMessage: 'Only for mentions and direct messages'})}
                        selected={pushStatus === 'mention'}
                        testID='notification_settings.pushNotification.onlyMentions'
                        type='select'
                        value='mention'
                        optionDescriptionTextStyle={styles.optionDescriptionTextStyle}
                        optionLabelTextStyle={styles.optionLabelTextStyle}
                    />
                    <SettingSeparator/>
                    <OptionItem
                        action={setMobilePushPref}
                        containerStyle={styles.container}
                        label={intl.formatMessage({id: 'notification_settings.pushNotification.never', defaultMessage: 'Never'})}
                        selected={pushStatus === 'none'}
                        testID='notification_settings.pushNotification.never'
                        type='select'
                        value='none'
                        optionDescriptionTextStyle={styles.optionDescriptionTextStyle}
                        optionLabelTextStyle={styles.optionLabelTextStyle}
                    />
                </>
            }
            {!sendPushNotifications &&
                <FormattedText
                    defaultMessage='Push notifications for mobile devices have been disabled by your System Administrator.'
                    id='notification_settings.pushNotification.disabled_long'
                    style={styles.disabled}
                />
            }
        </SettingBlock>
    );
};

export default MobileSendPush;
