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
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {updateLocalCustomStatus} from '@actions/local/user';
import {removeRecentCustomStatus, updateCustomStatus, unsetCustomStatus} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import TabletTitle from '@components/tablet_title';
import {CustomStatusDuration, Events, Screens} from '@constants';
import {SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {withServerUrl} from '@context/server';
import {withTheme} from '@context/theme';
import {observeConfig, observeRecentCustomStatus} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {dismissModal, goToScreen, showModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {getCurrentMomentForTimezone, getRoundedTime, isCustomStatusExpirySupported} from '@utils/helpers';
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

const {DONT_CLEAR, THIRTY_MINUTES, ONE_HOUR, FOUR_HOURS, TODAY, THIS_WEEK, DATE_AND_TIME} = CustomStatusDuration;
const DEFAULT_DURATION: CustomStatusDuration = TODAY;
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
        if (isCurrentCustomStatusSet && customStatus?.duration === DATE_AND_TIME && customStatus?.expires_at) {
            initialCustomExpiryTime = moment(customStatus?.expires_at);
        }

        this.state = {
            duration: isCurrentCustomStatusSet ? customStatus?.duration ?? DONT_CLEAR : DEFAULT_DURATION,
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
        if (EphemeralStore.getNavigationTopComponentId() === componentId) {
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
            if (isStatusSame && duration === DATE_AND_TIME) {
                isStatusSame = customStatus?.expires_at === expiresAt;
            }

            if (!isStatusSame) {
                const status: UserCustomStatus = {
                    emoji: emoji || 'speech_balloon',
                    text: text?.trim(),
                    duration: DONT_CLEAR,
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
                    duration: status.duration,
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
            case THIRTY_MINUTES:
                return currentTime.add(30, 'minutes').seconds(0).milliseconds(0).toISOString();
            case ONE_HOUR:
                return currentTime.add(1, 'hour').seconds(0).milliseconds(0).toISOString();
            case FOUR_HOURS:
                return currentTime.add(4, 'hours').seconds(0).milliseconds(0).toISOString();
            case TODAY:
                return currentTime.endOf('day').toISOString();
            case THIS_WEEK:
                return currentTime.endOf('week').toISOString();
            case DATE_AND_TIME:
                return expires_at.toISOString();
            case DONT_CLEAR:
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
        this.setState({emoji, text, duration});
    };

    handleRecentCustomStatusSuggestionClick = (status: UserCustomStatus) => {
        const {emoji, text, duration} = status;
        this.setState({emoji, text, duration: duration || DONT_CLEAR});
        if (duration === DATE_AND_TIME) {
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
            expires_at: duration === DATE_AND_TIME && expires_at ? moment(expires_at) : this.state.expires_at,
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
                        testID='custom_status.done.button'
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
                                        isExpirySupported={customStatusExpirySupported}
                                        onHandleClear={this.handleRecentCustomStatusClear}
                                        onHandleSuggestionClick={this.handleRecentCustomStatusSuggestionClick}
                                        recentCustomStatuses={recentCustomStatuses}
                                        theme={theme}
                                    />
                                )
                                }
                                <CustomStatusSuggestions
                                    intl={intl}
                                    isExpirySupported={customStatusExpirySupported}
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
    const config = observeConfig(database);
    return {
        currentUser: observeCurrentUser(database),
        customStatusExpirySupported: config.pipe(
            switchMap((cfg) => of$(isCustomStatusExpirySupported(cfg?.Version || ''))),
        ),
        recentCustomStatuses: observeRecentCustomStatus(database),
    };
});

export default withDatabase(enhancedCSM(augmentCSM));
