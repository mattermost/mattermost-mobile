// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    View,
} from 'react-native';
import {intlShape} from 'react-intl';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {getNotificationProps} from 'app/utils/notify_props';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import Section from 'app/screens/settings/section';
import SectionItem from 'app/screens/settings/section_item';

export default class NotificationSettingsAutoResponder extends PureComponent {
    static propTypes = {
        currentUser: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        onBack: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
        currentUserStatus: PropTypes.string.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props, context) {
        super(props, context);
        const {currentUser} = props;
        const {intl} = this.context;
        const notifyProps = getNotificationProps(currentUser);

        const autoResponderDefault = intl.formatMessage({
            id: 'mobile.notification_settings.auto_responder.default_message',
            defaultMessage: 'Hello, I am out of office and unable to respond to messages.',
        });

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);

        let autoReplyActive = 'false';
        if (props.currentUserStatus === 'ooo' && notifyProps.auto_reply_active) {
            autoReplyActive = 'true';
        }

        this.state = {
            ...notifyProps,
            auto_reply_active: autoReplyActive,
            auto_reply_message: notifyProps.auto_reply_message || autoResponderDefault,
        };
    }

    onNavigatorEvent = (event) => {
        if (event.type === 'ScreenChangedEvent') {
            switch (event.id) {
            case 'willDisappear':
                this.saveUserNotifyProps();
                break;
            }
        }
    };

    saveUserNotifyProps = () => {
        this.props.onBack({
            ...this.state,
            user_id: this.props.currentUser.id,
        });
    };

    onAutoResponseToggle = (active) => {
        if (active) {
            this.setState({auto_reply_active: 'true'});
            return;
        }
        this.setState({auto_reply_active: 'false'});
    };

    onAutoResponseChangeText = (message) => {
        return this.setState({auto_reply_message: message});
    };

    render() {
        const {theme} = this.props;
        const {
            auto_reply_active: autoReplyActive,
            auto_reply_message: autoReplyMessage,
        } = this.state;
        const style = getStyleSheet(theme);

        const autoReplyActiveLabel = autoReplyActive === 'true' ? (
            <FormattedText
                id='mobile.notification_settings.auto_responder.enabled'
                defaultMessage='Enabled'
            />
        ) : (
            <FormattedText
                id='mobile.notification_settings.auto_responder.disabled'
                defaultMessage='Disabled'
            />
        );

        return (
            <View style={style.container}>
                <StatusBar/>
                <View style={style.wrapper}>
                    <Section
                        disableHeader={true}
                        theme={theme}
                    >
                        <SectionItem
                            label={autoReplyActiveLabel}
                            action={this.onAutoResponseToggle}
                            actionType='toggle'
                            selected={autoReplyActive === 'true'}
                            theme={theme}
                        />
                    </Section>
                    {autoReplyActive === 'true' && (
                        <Section
                            headerId='mobile.notification_settings.auto_responder.message_title'
                            headerDefaultMessage='CUSTOM MESSAGE'
                            footerId='mobile.notification_settings.auto_responder.footer_message'
                            footerDefaultMessage='When enabled, sets your status to Out Of Office and answers direct messages with a custom response. Mentions in channels will not trigger a response. All notifications will be silenced.'
                            theme={theme}
                        >
                            <View style={style.inputContainer}>
                                <TextInputWithLocalizedPlaceholder
                                    autoFocus={true}
                                    ref={this.keywordsRef}
                                    value={autoReplyMessage}
                                    blurOnSubmit={false}
                                    onChangeText={this.onAutoResponseChangeText}
                                    multiline={true}
                                    style={style.input}
                                    autoCapitalize='none'
                                    autoCorrect={false}
                                    placeholder={{id: 'mobile.notification_settings.auto_responder.message_placeholder', defaultMessage: 'Message'}}
                                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                                    textAlignVertical='top'
                                    underlineColorAndroid='transparent'
                                    returnKeyType='done'
                                />
                            </View>
                        </Section>
                    )}
                </View>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
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
    };
});
