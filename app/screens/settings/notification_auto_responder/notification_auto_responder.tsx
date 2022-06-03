// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import BlockItem from '@components/block_item';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
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

const edges: Edge[] = ['left', 'right'];
type NotificationAutoResponderProps = {
    currentUser: UserModel;
}
const NotificationAutoResponder = ({currentUser}: NotificationAutoResponderProps) => {
    const theme = useTheme();
    const autoresponderRef = useRef(null);
    const intl = useIntl();
    const userNotifyProps = useMemo(() => getNotificationProps(currentUser), [currentUser.notifyProps]);

    const [notifyProps, setNotifyProps] = useState<Partial<UserNotifyProps>>({
        ...userNotifyProps,
        auto_responder_active: (currentUser.status === General.OUT_OF_OFFICE && userNotifyProps.auto_responder_active) ? 'true' : 'false',
        auto_responder_message: userNotifyProps.auto_responder_message || intl.formatMessage(OOO),
    });

    const styles = getStyleSheet(theme);

    const onAutoResponseToggle = useCallback((active: boolean) => {
        setNotifyProps({
            ...notifyProps,
            auto_responder_active: `${active}`,
        });
    }, [notifyProps]);

    const onAutoResponseChangeText = useCallback((message: string) => {
        setNotifyProps({
            ...notifyProps,
            auto_responder_message: message,
        });
    }, [notifyProps]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
        >
            <View style={styles.wrapper}>
                <View
                    style={styles.enabled}
                >
                    <BlockItem
                        label={
                            <FormattedText
                                id='notification_settings.auto_responder.enabled'
                                defaultMessage='Enabled'
                                style={styles.label}
                            />}
                        action={onAutoResponseToggle}
                        actionType='toggle'
                        selected={notifyProps.auto_responder_active === 'true'}
                    />
                </View>
                {notifyProps.auto_responder_active === 'true' && (
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
                        ref={autoresponderRef}
                        returnKeyType='done'
                        style={styles.input}
                        textAlignVertical='top'
                        theme={theme}
                        underlineColorAndroid='transparent'
                        value={notifyProps.auto_responder_message || ''}
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
