// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateMe} from '@actions/remote/user';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {popTopScreen, setButtons} from '@screens/navigation';
import {getSaveButton} from '@screens/settings/config';
import SettingSeparator from '@screens/settings/settings_separator';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

import SettingOption from '../setting_option';

import type UserModel from '@typings/database/models/servers/user';

const label = {
    id: t('notification_settings.auto_responder.message'),
    defaultMessage: 'Message',
};

const OOO = {
    id: t('notification_settings.auto_responder.default_message'),
    defaultMessage: 'Hello, I am out of office and unable to respond to messages.',
};
const SAVE_OOO_BUTTON_ID = 'notification_settings.auto_responder.save.button';

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        enabled: {
            marginTop: 32,
        },
        input: {
            color: theme.centerChannelColor,
            height: 150,
            paddingHorizontal: 15,
            paddingVertical: 10,
            ...typography('Body', 200, 'Regular'),
        },
        footer: {
            paddingHorizontal: 20,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            textAlign: 'justify',
            ...typography('Body', 75, 'Regular'),
            marginTop: 20,
        },
        textInputContainer: {
            paddingHorizontal: 20,
            marginTop: 20,
        },
    };
});

type NotificationAutoResponderProps = {
    componentId: string;
    currentUser: UserModel;
}
const NotificationAutoResponder = ({currentUser, componentId}: NotificationAutoResponderProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const userNotifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);
    const [autoResponderActive, setAutoResponderActive] = useState((currentUser.status === General.OUT_OF_OFFICE && userNotifyProps.auto_responder_active) ? 'true' : 'false');
    const [autoResponderMessage, setAutoResponderMessage] = useState(userNotifyProps.auto_responder_message || intl.formatMessage(OOO));

    const styles = getStyleSheet(theme);

    const close = () => popTopScreen(componentId);

    const saveButton = useMemo(() => getSaveButton(SAVE_OOO_BUTTON_ID, intl, theme), [theme.sidebarHeaderTextColor]);

    const onAutoResponseToggle = useCallback((active: boolean) => {
        setAutoResponderActive(`${active}`);
    }, []);

    const onAutoResponseChangeText = useCallback((message: string) => {
        setAutoResponderMessage(message);
    }, []);

    const saveAutoResponder = useCallback(() => {
        const notifyProps = {
            ...userNotifyProps,
            auto_responder_active: autoResponderActive,
            auto_responder_message: autoResponderMessage,
        } as unknown as UserNotifyProps;

        updateMe(serverUrl, {
            notify_props: notifyProps,
        });
        close();
    }, [serverUrl, autoResponderActive, autoResponderMessage, userNotifyProps]);

    useEffect(() => {
        const updatedMsg = userNotifyProps?.auto_responder_message !== autoResponderMessage;
        const enabling = currentUser.status !== General.OUT_OF_OFFICE && autoResponderActive === 'true';
        const disabling = currentUser.status === General.OUT_OF_OFFICE && autoResponderActive === 'false';

        const enabled = enabling || disabling || updatedMsg;

        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled,
            }],
        };
        setButtons(componentId, buttons);
    }, [autoResponderActive, autoResponderMessage, componentId, currentUser.status, userNotifyProps.auto_responder_message]);

    useNavButtonPressed(SAVE_OOO_BUTTON_ID, componentId, saveAutoResponder, [saveAutoResponder]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
        >
            <View
                style={styles.enabled}
            >
                <SettingOption
                    label={intl.formatMessage({id: 'notification_settings.auto_responder.to.enable', defaultMessage: 'Enable automatic replies'})}
                    action={onAutoResponseToggle}
                    type='toggle'
                    selected={autoResponderActive === 'true'}
                />
            </View>
            <SettingSeparator/>
            {autoResponderActive === 'true' && (
                <FloatingTextInput
                    allowFontScaling={true}
                    autoCapitalize='none'
                    autoCorrect={false}
                    blurOnSubmit={true}
                    containerStyle={styles.textInputContainer}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    label={intl.formatMessage(label)}
                    multiline={true}
                    onChangeText={onAutoResponseChangeText}
                    placeholder={intl.formatMessage(label)}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                    returnKeyType='done'
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
            />
        </SafeAreaView>
    );
};

export default NotificationAutoResponder;
