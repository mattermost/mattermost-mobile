// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateMe} from '@actions/remote/user';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import OptionItem from '@components/option_item';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {popTopScreen, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme, getKeyboardAppearanceFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const headerText = {
    id: t('notification_settings.auto_responder'),
    defaultMessage: 'Custom message',
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
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 15,
            height: 150,
            paddingHorizontal: 15,
            paddingVertical: 10,
        },
        footer: {
            paddingHorizontal: 15,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            textAlign: 'justify',
            ...typography('Body', 75),
        },
        area: {
            paddingHorizontal: 16,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        enabled: {
            paddingHorizontal: 8,
            backgroundColor: theme.centerChannelBg,
            marginBottom: 16,
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

    const saveButton = useMemo(() => {
        return {
            id: SAVE_OOO_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'notification_settings.auto_res.save.button',
            color: theme.sidebarHeaderTextColor,
            text: intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'}),
        };
    }, [theme.sidebarHeaderTextColor]);

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
            <View style={styles.wrapper}>
                <View
                    style={styles.enabled}
                >
                    <OptionItem
                        label={intl.formatMessage({id: 'notification_settings.auto_responder.enabled', defaultMessage: 'Enabled'})}
                        action={onAutoResponseToggle}
                        type='toggle'
                        selected={autoResponderActive === 'true'}
                    />
                </View>
                {autoResponderActive === 'true' && (
                    <FloatingTextInput
                        allowFontScaling={true}
                        autoCapitalize='none'
                        autoCorrect={false}
                        blurOnSubmit={true}
                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                        label={intl.formatMessage(headerText)}
                        multiline={true}
                        onChangeText={onAutoResponseChangeText}
                        placeholder={intl.formatMessage(headerText)}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                        returnKeyType='done'
                        style={styles.input}
                        textAlignVertical='top'
                        theme={theme}
                        underlineColorAndroid='transparent'
                        value={autoResponderMessage || ''}
                    />
                )}
                <FormattedText
                    id={'notification_settings.auto_responder.footer_message'}
                    defaultMessage={'Set a custom message that will be automatically sent in response to Direct Messages. Mentions in Public and Private Channels will not trigger the automated reply. Enabling Automatic Replies sets your status to Out of Office and disables email and push notifications.'}
                    style={styles.footer}
                />
            </View>
        </SafeAreaView>
    );
};

export default NotificationAutoResponder;
