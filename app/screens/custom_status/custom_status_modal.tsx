// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {View, Text, TouchableOpacity, TextInput, Keyboard} from 'react-native';
import {intlShape, injectIntl} from 'react-intl';
import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scrollview';
import {Navigation, NavigationComponent, NavigationComponentProps, OptionsTopBarButton, Options} from 'react-native-navigation';

import StatusBar from '@components/status_bar';
import {t} from '@utils/i18n';
import {UserCustomStatus} from '@mm-redux/types/users';
import Emoji from '@components/emoji';
import CompassIcon from '@components/compass_icon';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {Theme} from '@mm-redux/types/preferences';
import {CustomStatus} from '@constants';
import CustomStatusSuggestion from '@screens/custom_status/custom_status_suggestion';
import {dismissModal, showModal, mergeNavigationOptions} from '@actions/navigation';
import ClearButton from '@components/custom_status/clear_button';
import {preventDoubleTap} from '@utils/tap';

type DefaultUserCustomStatus = {
    emoji: string;
    message: string;
    messageDefault: string;
};

const defaultCustomStatusSuggestions: DefaultUserCustomStatus[] = [
    {emoji: 'calendar', message: t('custom_status.suggestions.in_a_meeting'), messageDefault: 'In a meeting'},
    {emoji: 'hamburger', message: t('custom_status.suggestions.out_for_lunch'), messageDefault: 'Out for lunch'},
    {emoji: 'sneezing_face', message: t('custom_status.suggestions.out_sick'), messageDefault: 'Out sick'},
    {emoji: 'house', message: t('custom_status.suggestions.working_from_home'), messageDefault: 'Working from home'},
    {emoji: 'palm_tree', message: t('custom_status.suggestions.on_a_vacation'), messageDefault: 'On a vacation'},
];

interface Props extends NavigationComponentProps {
    intl: typeof intlShape;
    theme: Theme;
    customStatus: UserCustomStatus;
    recentCustomStatuses: UserCustomStatus[];
    actions: {
        setCustomStatus: (customStatus: UserCustomStatus) => void;
        unsetCustomStatus: () => void;
        removeRecentCustomStatus: (customStatus: UserCustomStatus) => void;
    };
}

type State = {
    emoji: string;
    text: string;
}

class CustomStatusModal extends NavigationComponent<Props, State> {
    rightButton: OptionsTopBarButton = {
        id: 'update-custom-status',
        testID: 'custom_status.done_button',
        enabled: true,
        showAsAction: 'always',
    };

    static options(): Options {
        return {
            topBar: {
                title: {
                    alignment: 'center',
                },
            },
        };
    }

    constructor(props: Props) {
        super(props);

        this.rightButton.text = props.intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'});
        this.rightButton.color = props.theme.sidebarHeaderTextColor;

        const options: Options = {
            topBar: {
                rightButtons: [this.rightButton],
            },
        };

        mergeNavigationOptions(props.componentId, options);

        this.state = {
            emoji: props.customStatus.emoji,
            text: props.customStatus.text || '',
        };
    }

    componentDidMount() {
        Navigation.events().bindComponent(this);
    }

    navigationButtonPressed() {
        this.handleSetStatus();
    }

    handleSetStatus = () => {
        const {emoji, text} = this.state;
        const isStatusSet = emoji || text;
        const {customStatus} = this.props;
        if (isStatusSet) {
            const isStatusSame = customStatus.emoji === emoji && customStatus.text === text;
            if (!isStatusSame) {
                const status = {
                    emoji: emoji || 'speech_balloon',
                    text: text.trim(),
                };
                this.props.actions.setCustomStatus(status);
            }
        } else if (customStatus && customStatus.emoji) {
            this.props.actions.unsetCustomStatus();
        }
        Keyboard.dismiss();
        dismissModal();
    };

    handleTextChange = (value: string) => this.setState({text: value});

    handleRecentCustomStatusClear = (status: UserCustomStatus) => this.props.actions.removeRecentCustomStatus(status);

    clearHandle = () => {
        this.setState({emoji: '', text: ''});
    };

    handleSuggestionClick = (status: UserCustomStatus) => {
        const {emoji, text} = status;
        this.setState({emoji, text});
    };

    renderRecentCustomStatuses = () => {
        const {recentCustomStatuses, theme} = this.props;
        const style = getStyleSheet(theme);
        const recentStatuses = recentCustomStatuses.map((status: UserCustomStatus, index: number) => (
            <CustomStatusSuggestion
                key={status.text}
                handleSuggestionClick={this.handleSuggestionClick}
                handleClear={this.handleRecentCustomStatusClear}
                emoji={status.emoji}
                text={status.text}
                theme={theme}
                separator={index !== recentCustomStatuses.length - 1}
            />
        ));

        if (recentStatuses.length <= 0) {
            return null;
        }

        return (
            <>
                <View style={style.separator}/>
                <View testID='custom_status.recents'>
                    <Text style={style.title}>
                        {this.props.intl.formatMessage({
                            id: 'custom_status.suggestions.recent_title',
                            defaultMessage: 'RECENT',
                        })}
                    </Text>
                    <View style={style.block}>
                        {recentStatuses}
                    </View>
                </View >
            </>
        );
    };

    renderCustomStatusSuggestions = () => {
        const {recentCustomStatuses, theme} = this.props;
        const style = getStyleSheet(theme);
        const recentCustomStatusTexts = recentCustomStatuses.map((status: UserCustomStatus) => status.text);
        const customStatusSuggestions = defaultCustomStatusSuggestions.
            map((status) => ({
                emoji: status.emoji,
                text: status.messageDefault,
            })).
            filter((status: UserCustomStatus) => !recentCustomStatusTexts.includes(status.text)).
            map((status: UserCustomStatus, index: number, arr: UserCustomStatus[]) => (
                <CustomStatusSuggestion
                    key={status.text}
                    handleSuggestionClick={this.handleSuggestionClick}
                    emoji={status.emoji}
                    text={status.text}
                    theme={theme}
                    separator={index !== arr.length - 1}
                />
            ));

        if (customStatusSuggestions.length <= 0) {
            return null;
        }

        return (
            <>
                <View style={style.separator}/>
                <View testID='custom_status.suggestions'>
                    <Text style={style.title}>
                        {this.props.intl.formatMessage({
                            id: 'custom_status.suggestions.title',
                            defaultMessage: 'SUGGESTIONS',
                        })}
                    </Text>
                    <View style={style.block}>
                        {customStatusSuggestions}
                    </View>
                </View>
            </>
        );
    };

    openEmojiPicker = preventDoubleTap(() => {
        const screen = 'AddReaction';
        const passProps = {
            onEmojiPress: this.handleEmojiClick,
        };

        const options: Options = {
            topBar: {
                visible: false,
            },
        };

        requestAnimationFrame(() => {
            showModal(screen, '', passProps, options);
        });
    });

    handleEmojiClick = (emoji: string) => {
        dismissModal();
        this.setState({emoji});
    }

    render() {
        const {emoji, text} = this.state;
        const {theme} = this.props;

        const isStatusSet = emoji || text;
        const style = getStyleSheet(theme);
        const customStatusEmoji = (
            <TouchableOpacity
                testID={`custom_status.emoji.${isStatusSet ? (emoji || 'speech_balloon') : 'default'}`}
                onPress={this.openEmojiPicker}
                style={style.emoji}
            >
                {isStatusSet ? (
                    <Emoji
                        emojiName={emoji || 'speech_balloon'}
                        size={20}
                    />
                ) : (
                    <CompassIcon
                        name='emoticon-happy-outline'
                        size={24}
                        style={style.icon}
                    />
                )}
            </TouchableOpacity>
        );

        const customStatusInput = (
            <View style={style.inputContainer}>
                <TextInput
                    testID='custom_status.input'
                    value={text}
                    placeholder={this.props.intl.formatMessage({id: 'custom_status.set_status', defaultMessage: 'Set a Status'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={this.handleTextChange}
                    style={style.input}
                    autoCapitalize='none'
                    autoCorrect={false}
                    maxLength={CustomStatus.CUSTOM_STATUS_TEXT_CHARACTER_LIMIT}
                    underlineColorAndroid='transparent'
                    disableFullscreenUI={true}
                    keyboardType={'default'}
                    secureTextEntry={false}
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                />
                {customStatusEmoji}
                {isStatusSet ? (
                    <View
                        style={style.clearButton}
                        testID='custom_status.clear_input'
                    >
                        <ClearButton
                            handlePress={this.clearHandle}
                            theme={theme}
                        />
                    </View>
                ) : null}
            </View>
        );

        return (
            <SafeAreaView
                testID='custom_status.screen'
                style={style.container}
            >
                <StatusBar/>
                <KeyboardAwareScrollView
                    bounces={false}
                >
                    <View style={style.scrollView}>
                        {customStatusInput}
                        {this.renderRecentCustomStatuses()}
                        {this.renderCustomStatusSuggestions()}
                    </View>
                </KeyboardAwareScrollView>
            </SafeAreaView>
        );
    }
}

export default injectIntl(CustomStatusModal);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 32,
        },
        inputContainer: {
            position: 'relative',
            flexDirection: 'row',
            alignItems: 'center',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 14,
            paddingHorizontal: 52,
            textAlignVertical: 'center',
            height: 48,
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
        },
        emoji: {
            position: 'absolute',
            left: 14,
            top: 12,
        },
        separator: {
            marginTop: 32,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
        title: {
            fontSize: 17,
            marginBottom: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginLeft: 16,
        },
        clearButton: {
            position: 'absolute',
            top: 3,
            right: 14,
        },
    };
});
