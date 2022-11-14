// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import moment, {Moment} from 'moment-timezone';
import React from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {BackHandler, DeviceEventEmitter, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View} from 'react-native';
import {EventSubscription, Navigation, NavigationButtonPressedEvent, NavigationComponent, NavigationComponentProps} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateLocalCustomStatus} from '@actions/local/user';
import {removeRecentCustomStatus, updateCustomStatus, unsetCustomStatus} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import TabletTitle from '@components/tablet_title';
import {Events, Screens} from '@constants';
import {CustomStatusDurationEnum, SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {withServerUrl} from '@context/server';
import {withTheme} from '@context/theme';
import {observeIsCustomStatusExpirySupported, observeRecentCustomStatus} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {dismissModal, goToScreen, showModal} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {getCurrentMomentForTimezone, getRoundedTime} from '@utils/helpers';
import {logDebug} from '@utils/log';
import {mergeNavigationOptions} from '@utils/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {
    getTimezone,
    getUserCustomStatus,
    isCustomStatusExpired as verifyExpiredStatus,
} from '@utils/user';

import ClearAfter from './components/clear_after';
import CustomStatusInput from './components/custom_status_input';
import CustomStatusSuggestions from './components/custom_status_suggestions';
import RecentCustomStatuses from './components/recent_custom_statuses';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

interface Props extends NavigationComponentProps {
    customStatusExpirySupported: boolean;
    currentUser: UserModel;
    intl: IntlShape;
    isModal?: boolean;
    isTablet?: boolean;
    recentCustomStatuses: UserCustomStatus[];
    serverUrl: string;
    theme: Theme;
}

type State = {
    emoji?: string;
    text?: string;
    duration: CustomStatusDuration;
    expires_at: Moment;
};

const DEFAULT_DURATION: CustomStatusDuration = 'today';
const BTN_UPDATE_STATUS = 'update-custom-status';
const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        contentContainerStyle: {
            height: '99%',
        },
        scrollView: {
            flex: 1,
            paddingTop: 32,
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
    };
});

class CustomStatusModal extends NavigationComponent<Props, State> {
    private navigationEventListener: EventSubscription | undefined;
    private isCustomStatusExpired: boolean | undefined;
    private backListener: EventSubscription | undefined;

    constructor(props: Props) {
        super(props);
        const {intl, theme, componentId} = props;

        mergeNavigationOptions(componentId, {
            topBar: {
                rightButtons: [
                    {
                        enabled: true,
                        id: BTN_UPDATE_STATUS,
                        showAsAction: 'always',
                        testID: 'custom_status.done.button',
                        text: intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'}),
                        color: theme.sidebarHeaderTextColor,
                    },
                ],
            },
        });

        this.setUp();
    }

    setUp = () => {
        const {currentUser} = this.props;
        const userTimezone = getTimezone(currentUser.timezone);

        const customStatus = this.getCustomStatus();

        this.isCustomStatusExpired = verifyExpiredStatus(currentUser);

        const currentTime = getCurrentMomentForTimezone(userTimezone ?? '');

        let initialCustomExpiryTime: Moment = getRoundedTime(currentTime);
        const isCurrentCustomStatusSet = !this.isCustomStatusExpired && (customStatus?.text || customStatus?.emoji);
        if (isCurrentCustomStatusSet && customStatus?.duration === 'date_and_time' && customStatus?.expires_at) {
            initialCustomExpiryTime = moment(customStatus?.expires_at);
        }

        this.state = {
            duration: isCurrentCustomStatusSet ? customStatus?.duration ?? CustomStatusDurationEnum.DONT_CLEAR : DEFAULT_DURATION,
            emoji: isCurrentCustomStatusSet ? customStatus?.emoji : '',
            expires_at: initialCustomExpiryTime,
            text: isCurrentCustomStatusSet ? customStatus?.text : '',
        };
    };

    getCustomStatus = () => {
        const {currentUser} = this.props;
        return getUserCustomStatus(currentUser);
    };

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
        this.backListener = BackHandler.addEventListener('hardwareBackPress', this.onBackPress);
    }

    componentWillUnmount() {
        this.navigationEventListener?.remove();
        this.backListener?.remove();
    }

    navigationButtonPressed({buttonId}: NavigationButtonPressedEvent) {
        switch (buttonId) {
            case BTN_UPDATE_STATUS:
                this.handleSetStatus();
                break;
        }
    }

    onBackPress = () => {
        const {componentId} = this.props;
        if (NavigationStore.getNavigationTopComponentId() === componentId) {
            if (this.props.isTablet) {
                DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, '');
            } else {
                dismissModal({componentId});
            }
            return true;
        }
        return false;
    };

    handleSetStatus = async () => {
        const {customStatusExpirySupported, currentUser, serverUrl} = this.props;
        const {emoji, text, duration} = this.state;
        const customStatus = this.getCustomStatus();

        const isStatusSet = emoji || text;
        if (isStatusSet) {
            let isStatusSame = customStatus?.emoji === emoji && customStatus?.text === text && customStatus?.duration === duration;
            const expiresAt = this.calculateExpiryTime(duration);
            if (isStatusSame && duration === 'date_and_time') {
                isStatusSame = customStatus?.expires_at === expiresAt;
            }

            if (!isStatusSame) {
                const status: UserCustomStatus = {
                    emoji: emoji || 'speech_balloon',
                    text: text?.trim(),
                    duration: CustomStatusDurationEnum.DONT_CLEAR,
                };

                if (customStatusExpirySupported) {
                    status.duration = duration;
                    status.expires_at = expiresAt;
                }
                const {error} = await updateCustomStatus(serverUrl, status);
                if (error) {
                    DeviceEventEmitter.emit(SET_CUSTOM_STATUS_FAILURE);
                    return;
                }

                updateLocalCustomStatus(serverUrl, currentUser, status);

                this.setState({
                    duration: status.duration!,
                    emoji: status.emoji,
                    expires_at: moment(status.expires_at),
                    text: status.text,
                });
            }
        } else if (customStatus?.emoji) {
            const unsetResponse = await unsetCustomStatus(serverUrl);

            if (unsetResponse?.data) {
                updateLocalCustomStatus(serverUrl, currentUser, undefined);
            }
        }
        Keyboard.dismiss();
        if (this.props.isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, '');
        } else {
            dismissModal();
        }
    };

    calculateExpiryTime = (duration: CustomStatusDuration): string => {
        const {currentUser} = this.props;
        const userTimezone = getTimezone(currentUser.timezone);
        const currentTime = getCurrentMomentForTimezone(userTimezone);

        const {expires_at} = this.state;
        switch (duration) {
            case 'thirty_minutes':
                return currentTime.add(30, 'minutes').seconds(0).milliseconds(0).toISOString();
            case 'one_hour':
                return currentTime.add(1, 'hour').seconds(0).milliseconds(0).toISOString();
            case 'four_hours':
                return currentTime.add(4, 'hours').seconds(0).milliseconds(0).toISOString();
            case 'today':
                return currentTime.endOf('day').toISOString();
            case 'this_week':
                return currentTime.endOf('week').toISOString();
            case 'date_and_time':
                return expires_at.toISOString();
            case CustomStatusDurationEnum.DONT_CLEAR:
            default:
                return '';
        }
    };

    handleTextChange = (text: string) => {
        this.setState({text});
    };

    handleRecentCustomStatusClear = (status: UserCustomStatus) => removeRecentCustomStatus(this.props.serverUrl, status);

    clearHandle = () => this.setState({emoji: '', text: '', duration: DEFAULT_DURATION});

    handleCustomStatusSuggestionClick = (status: UserCustomStatus) => {
        const {emoji, text, duration} = status;
        if (!duration) {
            // This should never happen, but we add a safeguard here
            logDebug('clicked on a custom status with no duration');
            return;
        }
        this.setState({emoji, text, duration});
    };

    handleRecentCustomStatusSuggestionClick = (status: UserCustomStatus) => {
        const {emoji, text, duration} = status;
        this.setState({emoji, text, duration: duration || CustomStatusDurationEnum.DONT_CLEAR});
        if (duration === 'date_and_time') {
            this.openClearAfterModal();
        }
    };

    openEmojiPicker = preventDoubleTap(() => {
        const {theme, intl} = this.props;
        CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor).then((source) => {
            const screen = Screens.EMOJI_PICKER;
            const title = intl.formatMessage({id: 'mobile.custom_status.choose_emoji', defaultMessage: 'Choose an emoji'});
            const passProps = {closeButton: source, onEmojiPress: this.handleEmojiClick};

            showModal(screen, title, passProps);
        });
    });

    handleEmojiClick = (emoji: string) => {
        this.setState({emoji});
    };

    handleClearAfterClick = (duration: CustomStatusDuration, expires_at: string) =>
        this.setState({
            duration,
            expires_at: duration === 'date_and_time' && expires_at ? moment(expires_at) : this.state.expires_at,
        });

    openClearAfterModal = async () => {
        const {intl, theme} = this.props;
        const screen = Screens.CUSTOM_STATUS_CLEAR_AFTER;
        const title = intl.formatMessage({id: 'mobile.custom_status.clear_after.title', defaultMessage: 'Clear Custom Status After'});
        const passProps = {
            handleClearAfterClick: this.handleClearAfterClick,
            initialDuration: this.state.duration,
            intl,
            theme,
        };

        if (this.props.isTablet) {
            showModal(screen, title, passProps);
        } else {
            goToScreen(screen, title, passProps);
        }
    };

    render() {
        const {duration, emoji, expires_at, text} = this.state;
        const {customStatusExpirySupported, intl, recentCustomStatuses, theme} = this.props;
        const isStatusSet = Boolean(emoji || text);
        const style = getStyleSheet(theme);

        return (
            <>
                {this.props.isTablet &&
                    <TabletTitle
                        action={intl.formatMessage({id: 'mobile.custom_status.modal_confirm', defaultMessage: 'Done'})}
                        onPress={this.handleSetStatus}
                        testID='custom_status'
                        title={intl.formatMessage({id: 'mobile.routes.custom_status', defaultMessage: 'Set a Status'})}
                    />
                }
                <SafeAreaView
                    edges={edges}
                    style={style.container}
                    testID='custom_status.screen'
                >
                    <KeyboardAvoidingView
                        behavior='padding'
                        enabled={Platform.OS === 'ios'}
                        keyboardVerticalOffset={100}
                        contentContainerStyle={style.contentContainerStyle}
                    >
                        <ScrollView
                            bounces={false}
                            keyboardDismissMode='none'
                            keyboardShouldPersistTaps='always'
                            testID='custom_status.scroll_view'
                        >
                            <View style={style.scrollView}>
                                <View style={style.block}>
                                    <CustomStatusInput
                                        emoji={emoji}
                                        isStatusSet={isStatusSet}
                                        onChangeText={this.handleTextChange}
                                        onClearHandle={this.clearHandle}
                                        onOpenEmojiPicker={this.openEmojiPicker}
                                        text={text}
                                        theme={theme}
                                    />
                                    {isStatusSet && customStatusExpirySupported && (
                                        <ClearAfter
                                            duration={duration}
                                            expiresAt={expires_at}
                                            onOpenClearAfterModal={this.openClearAfterModal}
                                            theme={theme}
                                        />
                                    )}
                                </View>
                                {recentCustomStatuses.length > 0 && (
                                    <RecentCustomStatuses
                                        onHandleClear={this.handleRecentCustomStatusClear}
                                        onHandleSuggestionClick={this.handleRecentCustomStatusSuggestionClick}
                                        recentCustomStatuses={recentCustomStatuses}
                                        theme={theme}
                                    />
                                )
                                }
                                <CustomStatusSuggestions
                                    intl={intl}
                                    onHandleCustomStatusSuggestionClick={this.handleCustomStatusSuggestionClick}
                                    recentCustomStatuses={recentCustomStatuses}
                                    theme={theme}
                                />
                            </View>
                            <View style={style.separator}/>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </>
        );
    }
}

const augmentCSM = injectIntl(withTheme(withServerUrl(CustomStatusModal)));

const enhancedCSM = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
        recentCustomStatuses: observeRecentCustomStatus(database),
        customStatusExpirySupported: observeIsCustomStatusExpirySupported(database),
    };
});

export default withDatabase(enhancedCSM(augmentCSM));
