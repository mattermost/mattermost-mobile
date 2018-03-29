// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {injectIntl} from 'react-intl';

import FormattedText from 'app/components/formatted_text';
import RadioButtonGroup from 'app/components/radio_button';
import StatusBar from 'app/components/status_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import SectionItem from 'app/screens/settings/section_item';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import NotificationSettingsMentionsBase from './notification_settings_mention_base';

class NotificationSettingsMentionsIos extends NotificationSettingsMentionsBase {
    cancelMentionKeys = () => {
        this.setState({showKeywordsModal: false});
        this.keywords = this.state.mention_keys;
    };

    cancelReplyNotification = () => {
        this.setState({showReplyModal: false});
        this.replyValue = this.state.comments;
    };

    onKeywordsChangeText = (value) => {
        this.keywords = value;
    };

    onReplyChanged = (value) => {
        this.replyValue = value;
    };

    renderKeywordsModal(style) {
        const {theme} = this.props;

        return (
            <Modal
                animationType='slide'
                transparent={true}
                visible={this.state.showKeywordsModal}
                onRequestClose={this.cancelMentionKeys}
            >
                <View style={style.modalOverlay}>
                    <View style={style.modal}>
                        <View style={style.modalBody}>
                            <View style={style.modalTitleContainer}>
                                <FormattedText
                                    id='user.settings.notifications.email.send'
                                    defaultMessage='Send email notifications'
                                    style={style.modalTitle}
                                />
                            </View>
                            <TextInputWithLocalizedPlaceholder
                                autoFocus={true}
                                defaultValue={this.keywords}
                                blurOnSubmit={false}
                                onChangeText={this.onKeywordsChangeText}
                                multiline={false}
                                style={style.input}
                                autoCapitalize='none'
                                autoCorrect={false}
                                placeholder={{id: 'mobile.notification_settings_mentions.keywordsDescription', defaultMessage: 'Other words that trigger a mention'}}
                                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                                returnKeyType='done'
                                underlineColorAndroid={theme.linkColor}
                            />
                            <FormattedText
                                id='mobile.notification_settings_mentions.keywordsHelp'
                                defaultMessage='Keywords are non-case sensitive and should be separated by a comma.'
                                style={style.modalHelpText}
                            />
                        </View>
                        <View style={style.modalFooter}>
                            <View style={style.separator}/>
                            <View style={style.modalFooterContainer}>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.cancelMentionKeys}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_cancel'
                                        defaultMessage='CANCEL'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                                <View style={{marginRight: 10}}/>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.saveMentionKeys}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_save'
                                        defaultMessage='SAVE'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    renderReplyModal(style) {
        const {intl} = this.props;

        const options = [{
            label: intl.formatMessage({
                id: 'mobile.account_notifications.threads_start_participate',
                defaultMessage: 'Threads that I start or participate in',
            }),
            value: 'any',
            checked: this.state.comments === 'any',
        }, {
            label: intl.formatMessage({
                id: 'mobile.account_notifications.threads_start',
                defaultMessage: 'Threads that I start',
            }),
            value: 'root',
            checked: this.state.comments === 'root',
        }, {
            label: intl.formatMessage({
                id: 'mobile.account_notifications.threads_mentions',
                defaultMessage: 'Mentions in threads',
            }),
            value: 'never',
            checked: this.state.comments === 'never',
        }];

        return (
            <Modal
                animationType='slide'
                transparent={true}
                visible={this.state.showReplyModal}
                onRequestClose={this.cancelReplyNotification}
            >
                <View style={style.modalOverlay}>
                    <View style={style.modal}>
                        <View style={style.modalBody}>
                            <View style={style.modalTitleContainer}>
                                <FormattedText
                                    id='mobile.notification_settings.mentions.reply_title'
                                    defaultMessage='Send Reply notifications for'
                                    style={style.modalTitle}
                                />
                            </View>
                            <RadioButtonGroup
                                name='replySettings'
                                onSelect={this.onReplyChanged}
                                options={options}
                            />
                        </View>
                        <View style={style.modalFooter}>
                            <View style={style.separator}/>
                            <View style={style.modalFooterContainer}>
                                <TouchableOpacity
                                    style={style.modalFooterOptionContainer}
                                    onPress={this.cancelReplyNotification}
                                >
                                    <FormattedText
                                        id='mobile.notification_settings.modal_cancel'
                                        defaultMessage='CANCEL'
                                        style={style.modalFooterOption}
                                    />
                                </TouchableOpacity>
                                <View>
                                    <View style={{marginRight: 10}}/>
                                    <TouchableOpacity
                                        style={style.modalFooterOptionContainer}
                                        onPress={this.saveReplyNotification}
                                    >
                                        <FormattedText
                                            id='mobile.notification_settings.modal_save'
                                            defaultMessage='SAVE'
                                            style={style.modalFooterOption}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    renderReplySection() {
        const {theme} = this.props;

        let i18nId;
        let i18nMessage;
        switch (this.state.comments) {
        case 'root':
            i18nId = 'mobile.account_notifications.threads_start';
            i18nMessage = 'Threads that I start';
            break;
        case 'never':
            i18nId = 'mobile.account_notifications.threads_mentions';
            i18nMessage = 'Mentions in threads';
            break;
        case 'any':
        default:
            i18nId = 'mobile.account_notifications.threads_start_participate';
            i18nMessage = 'Threads that I start or participate in';
            break;
        }

        return (
            <SectionItem
                description={(
                    <FormattedText
                        id={i18nId}
                        defaultMessage={i18nMessage}
                    />
                )}
                label={(
                    <FormattedText
                        id='user.settings.notifications.comments'
                        defaultMessage='Reply notifications'
                    />
                )}
                action={this.showReplyModal}
                actionType='default'
                theme={theme}
            />
        );
    }

    saveMentionKeys = () => {
        this.setState({showKeywordsModal: false});
        this.updateMentionKeys(this.keywords);
    };

    saveReplyNotification = () => {
        this.setState({showReplyModal: false});
        this.setReplyNotifications(this.replyValue);
    };

    showKeywordsModal = () => {
        this.setState({showKeywordsModal: true});
    };

    showReplyModal = () => {
        this.setState({showReplyModal: true});
    };

    render() {
        const {currentUser, theme} = this.props;
        const style = getStyleSheet(theme);

        let mentionKeysComponent;
        if (this.state.mention_keys) {
            mentionKeysComponent = (<Text>{this.state.mention_keys}</Text>);
        } else {
            mentionKeysComponent = (
                <FormattedText
                    id='mobile.notification_settings_mentions.keywordsDescription'
                    defaultMessage='Other words that trigger a mention'
                />
            );
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <ScrollView
                    style={style.scrollView}
                    contentContainerStyle={style.scrollViewContent}
                >
                    {currentUser.first_name.length > 0 &&
                    <View>
                        <SectionItem
                            label={(
                                <Text>
                                    {currentUser.first_name}
                                </Text>
                            )}
                            description={(
                                <FormattedText
                                    id='mobile.notification_settings.mentions.sensitiveName'
                                    defaultMessage='Your case sensitive first name'
                                />
                            )}
                            action={this.toggleFirstNameMention}
                            actionType='toggle'
                            selected={this.state.first_name === 'true'}
                            theme={theme}
                        />
                        <View style={style.separator}/>
                    </View>
                    }
                    <SectionItem
                        label={(
                            <Text>
                                {currentUser.username}
                            </Text>
                        )}
                        description={(
                            <FormattedText
                                id='mobile.notification_settings.mentions.sensitiveUsername'
                                defaultMessage='Your non-case sensitive username'
                            />
                        )}
                        selected={this.state.usernameMention}
                        action={this.toggleUsernameMention}
                        actionType='toggle'
                        theme={theme}
                    />
                    <View style={style.separator}/>
                    <SectionItem
                        label={(
                            <Text>
                                {'@channel, @all, @here'}
                            </Text>
                        )}
                        description={(
                            <FormattedText
                                id='mobile.notification_settings.mentions.channelWide'
                                defaultMessage='Channel-wide mentions'
                            />
                        )}
                        action={this.toggleChannelMentions}
                        actionType='toggle'
                        selected={this.state.channel === 'true'}
                        theme={theme}
                    />
                    <View style={style.separator}/>
                    <SectionItem
                        label={(
                            <FormattedText
                                id='mobile.notification_settings_mentions.keywords'
                                defaultMessage='Keywords'
                            />
                        )}
                        description={mentionKeysComponent}
                        action={this.showKeywordsModal}
                        actionType='default'
                        theme={theme}
                    />
                    <View style={style.separator}/>
                    {this.renderReplySection()}
                    <View style={style.separator}/>
                </ScrollView>
                {this.renderKeywordsModal(style)}
                {this.renderReplyModal(style)}
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
        input: {
            color: theme.centerChannelColor,
            fontSize: 12,
            height: 40,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        },
        scrollViewContent: {
            paddingVertical: 0,
        },
        modalOverlay: {
            backgroundColor: changeOpacity('#000000', 0.6),
            alignItems: 'center',
            flex: 1,
        },
        modal: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
            marginTop: 20,
            width: '95%',
        },
        modalBody: {
            paddingHorizontal: 24,
        },
        modalTitleContainer: {
            marginBottom: 30,
            marginTop: 20,
        },
        modalTitle: {
            color: theme.centerChannelColor,
            fontSize: 19,
        },
        modalOptionDisabled: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 17,
        },
        modalInput: {
            color: theme.centerChannelColor,
            fontSize: 19,
        },
        modalHelpText: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13,
            marginTop: 20,
        },
        modalFooter: {
            alignItems: 'flex-end',
            height: 58,
            marginTop: 40,
            width: '100%',
        },
        modalFooterContainer: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            paddingRight: 24,
        },
        modalFooterOptionContainer: {
            alignItems: 'center',
            height: 40,
            justifyContent: 'center',
            paddingHorizontal: 10,
            paddingVertical: 5,
        },
        modalFooterOption: {
            color: theme.linkColor,
            fontSize: 14,
        },
    };
});

export default injectIntl(NotificationSettingsMentionsIos);
