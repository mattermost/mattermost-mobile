// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {fetchStatusInBatch, updateMe} from '@actions/remote/user';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {t} from '@i18n';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const label = {
    id: t('notification_settings.auto_responder.message'),
    defaultMessage: 'Message',
};

const OOO = {
    id: t('notification_settings.auto_responder.default_message'),
    defaultMessage: 'Hello, I am out of office and unable to respond to messages.',
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        input: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
            flex: 1,
        },
        textInputContainer: {
            width: '91%',
            marginTop: 20,
            alignSelf: 'center',
            height: 154,
        },
        footer: {
            paddingHorizontal: 20,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            ...typography('Body', 75, 'Regular'),
            marginTop: 20,
        },
    };
});

type NotificationAutoResponderProps = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
}
const NotificationAutoResponder = ({currentUser, componentId}: NotificationAutoResponderProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const notifyProps = useMemo(() => getNotificationProps(currentUser), [/* dependency array should remain empty */]);

    const initialAutoResponderActive = useMemo(() => Boolean(currentUser?.status === General.OUT_OF_OFFICE && notifyProps.auto_responder_active === 'true'), [/* dependency array should remain empty */]);
    const [autoResponderActive, setAutoResponderActive] = useState<boolean>(initialAutoResponderActive);

    const initialOOOMsg = useMemo(() => notifyProps.auto_responder_message || intl.formatMessage(OOO), [/* dependency array should remain empty */]);
    const [autoResponderMessage, setAutoResponderMessage] = useState<string>(initialOOOMsg);

    const styles = getStyleSheet(theme);

    const close = () => popTopScreen(componentId);

    const saveAutoResponder = useCallback(() => {
        const canSaveSetting = initialAutoResponderActive !== autoResponderActive || initialOOOMsg !== autoResponderMessage;

        if (canSaveSetting) {
            updateMe(serverUrl, {
                notify_props: {
                    ...notifyProps,
                    auto_responder_active: `${autoResponderActive}`,
                    auto_responder_message: autoResponderMessage,
                },
            });
            if (currentUser) {
                fetchStatusInBatch(serverUrl, currentUser.id);
            }
        }
        close();
    }, [serverUrl, autoResponderActive, autoResponderMessage, notifyProps, currentUser?.id]);

    useBackNavigation(saveAutoResponder);

    useAndroidHardwareBackHandler(componentId, saveAutoResponder);

    return (
        <SettingContainer testID='auto_responder_notification_settings'>
            <SettingOption
                label={intl.formatMessage({id: 'notification_settings.auto_responder.to.enable', defaultMessage: 'Enable automatic replies'})}
                action={setAutoResponderActive}
                testID='auto_responder_notification_settings.enable_automatic_replies.option'
                type='toggle'
                selected={autoResponderActive}
            />
            <SettingSeparator/>
            {autoResponderActive && (
                <FloatingTextInput
                    allowFontScaling={true}
                    autoCapitalize='none'
                    autoCorrect={false}
                    containerStyle={styles.textInputContainer}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    label={intl.formatMessage(label)}
                    multiline={true}
                    multilineInputHeight={154}
                    onChangeText={setAutoResponderMessage}
                    placeholder={intl.formatMessage(label)}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                    returnKeyType='default'
                    testID='auto_responder_notification_settings.message.input'
                    textAlignVertical='top'
                    textInputStyle={styles.input}
                    theme={theme}
                    underlineColorAndroid='transparent'
                    value={autoResponderMessage || ''}
                />
            )}
            <FormattedText
                id={'notification_settings.auto_responder.footer.message'}
                defaultMessage={'Set a custom message that is automatically sent in response to direct messages, such as an out of office or vacation reply. Enabling this setting changes your status to Out of Office and disables notifications.'}
                style={styles.footer}
                testID='auto_responder_notification_settings.message.input.description'
            />
        </SettingContainer>
    );
};

export default NotificationAutoResponder;
