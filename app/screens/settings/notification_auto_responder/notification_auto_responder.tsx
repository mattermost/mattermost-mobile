// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import Block from '@components/block';
import BlockItem from '@components/block_item';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';
import {getNotificationProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const headerText = {
    id: t('notification_settings.auto_responder'),
    defaultMessage: 'Custom message',
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
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 15,
            height: 150,
            paddingHorizontal: 15,
            paddingVertical: 10,
        },
        footer: {
            marginHorizontal: 15,
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        area: {
            paddingHorizontal: 16,
        },
        upperCase: {
            textTransform: 'uppercase',
        },
    };
});
type NotificationAutoResponderProps = {
    currentUser: UserModel;
}
const NotificationAutoResponder = ({currentUser}: NotificationAutoResponderProps) => {
    const autoresponderRef = useRef(null);
    const [notifyProps, setNotifyProps] = useState<Partial<UserNotifyProps>>(getNotificationProps(currentUser));
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onAutoResponseToggle = (active: boolean) => {
        setNotifyProps({
            ...notifyProps,
            auto_responder_active: active ? 'true' : 'false',
        });
    };

    const onAutoResponseChangeText = (message: string) => {
        setNotifyProps({
            ...notifyProps,
            auto_responder_message: message,
        });
    };

    const onSubmitEditing = () => {
        // popTopScreen();
    };

    useEffect(() => {
        const autoResponderDefault = intl.formatMessage({
            id: 'notification_settings.auto_responder.default_message',
            defaultMessage: 'Hello, I am out of office and unable to respond to messages.',
        });

        setNotifyProps({
            ...notifyProps,
            auto_responder_active: (currentUser.status === General.OUT_OF_OFFICE && notifyProps.auto_responder_active) ? 'true' : 'false',
            auto_responder_message: notifyProps.auto_responder_message || autoResponderDefault,
        });
    }, []);

    useEffect(() => {
        const autoresponderTimeout = setTimeout(() => {
            // autoresponderRef.current?.focus();
        }, 500);

        return () => {
            clearTimeout(autoresponderTimeout);

            //todo: MM-38711 : save the auto responder
        };
    }, [notifyProps]);

    const autoResponderActiveLabel = (
        <FormattedText
            id='notification_settings.auto_responder.enabled'
            defaultMessage='Enabled'
        />
    );
    const {
        auto_responder_active: autoResponderActive,
        auto_responder_message: autoResponderMessage,
    } = notifyProps;

    return (
        <SafeAreaView
            edges={['left', 'right']}
            style={styles.container}
        >

            <View style={styles.wrapper}>
                <BlockItem
                    label={autoResponderActiveLabel}
                    action={onAutoResponseToggle}
                    actionType='toggle'
                    selected={autoResponderActive === 'true'}
                />
                {autoResponderActive === 'true' && (
                    <Block
                        headerText={headerText}
                        headerStyles={styles.upperCase}
                        containerStyles={styles.area}
                    >
                        <View style={styles.inputContainer}>
                            <FloatingTextInput
                                theme={theme}
                                label={intl.formatMessage(headerText)}
                                allowFontScaling={true}
                                ref={autoresponderRef}
                                value={autoResponderMessage || ''}
                                blurOnSubmit={true}
                                onChangeText={onAutoResponseChangeText}
                                onSubmitEditing={onSubmitEditing}
                                multiline={true}
                                style={styles.input}
                                autoCapitalize='none'
                                autoCorrect={false}
                                placeholder={intl.formatMessage({id: t('notification_settings.auto_responder.message_placeholder'), defaultMessage: 'Message'})}
                                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                                textAlignVertical='top'
                                underlineColorAndroid='transparent'
                                returnKeyType='done'
                                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                            />
                        </View>
                    </Block>
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
