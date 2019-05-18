// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Dimensions,
    Keyboard,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {app} from 'app/mattermost';

import Autocomplete, {AUTOCOMPLETE_MAX_HEIGHT} from 'app/components/autocomplete';
import InteractiveDialogController from 'app/components/interactive_dialog_controller';
import ChannelLoader from 'app/components/channel_loader';
import EmptyToolbar from 'app/components/start/empty_toolbar';
import FileUploadPreview from 'app/components/file_upload_preview';
import MainSidebar from 'app/components/sidebars/main';
import SettingsSidebar from 'app/components/sidebars/settings';
import NetworkIndicator from 'app/components/network_indicator';
import SafeAreaView from 'app/components/safe_area_view';
import StatusBar from 'app/components/status_bar';
import {DeviceTypes, ViewTypes} from 'app/constants';
import {preventDoubleTap} from 'app/utils/tap';
import PostTextbox from 'app/components/post_textbox';
import PushNotifications from 'app/push_notifications';
import tracker from 'app/utils/time_tracker';
import LocalConfig from 'assets/config';

import telemetry from 'app/telemetry';

import ChannelNavBar from './channel_nav_bar';
import ChannelPostList from './channel_post_list';

const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    IOSX_TOP_PORTRAIT,
} = ViewTypes;

const CHANNEL_POST_TEXTBOX_CURSOR_CHANGE = 'onChannelTextBoxCursorChange';
const CHANNEL_POST_TEXTBOX_VALUE_CHANGE = 'onChannelTextBoxValueChange';

let ClientUpgradeListener;

export default class Channel extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadChannelsIfNecessary: PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: PropTypes.func.isRequired,
            selectDefaultTeam: PropTypes.func.isRequired,
            selectInitialChannel: PropTypes.func.isRequired,
            recordLoadTime: PropTypes.func.isRequired,
        }).isRequired,
        currentChannelId: PropTypes.string,
        channelsRequestFailed: PropTypes.bool,
        currentTeamId: PropTypes.string,
        isLandscape: PropTypes.bool,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        showTermsOfService: PropTypes.bool,
        disableTermsModal: PropTypes.bool,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    static defaultProps = {
        disableTermsModal: false,
    };

    constructor(props) {
        super(props);

        this.postTextbox = React.createRef();
        this.keyboardTracker = React.createRef();

        props.navigator.setStyle({
            screenBackgroundColor: props.theme.centerChannelBg,
        });

        if (LocalConfig.EnableMobileClientUpgrade && !ClientUpgradeListener) {
            ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
        }
    }

    componentWillMount() {
        EventEmitter.on('leave_team', this.handleLeaveTeam);

        if (this.props.currentTeamId) {
            this.loadChannels(this.props.currentTeamId);
        } else {
            this.props.actions.selectDefaultTeam();
        }

        if (this.props.currentChannelId) {
            PushNotifications.clearChannelNotifications(this.props.currentChannelId);
        }
    }

    componentDidMount() {
        if (tracker.initialLoad) {
            this.props.actions.recordLoadTime('Start time', 'initialLoad');
        }

        if (this.props.showTermsOfService && !this.props.disableTermsModal) {
            this.showTermsOfServiceModal();
        }

        EventEmitter.emit('renderDrawer');

        telemetry.end(['start:channel_screen']);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            this.props.navigator.setStyle({
                screenBackgroundColor: nextProps.theme.centerChannelBg,
            });
        }

        if (nextProps.currentTeamId && this.props.currentTeamId !== nextProps.currentTeamId) {
            this.loadChannels(nextProps.currentTeamId);
        }

        if (nextProps.currentChannelId !== this.props.currentChannelId &&
            nextProps.currentTeamId === this.props.currentTeamId) {
            PushNotifications.clearChannelNotifications(nextProps.currentChannelId);
        }

        if (LocalConfig.EnableMobileClientUpgrade && !ClientUpgradeListener) {
            ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
        }
    }

    componentDidUpdate(prevProps) {
        if (tracker.teamSwitch) {
            this.props.actions.recordLoadTime('Switch Team', 'teamSwitch');
        }

        // When the team changes emit the event to render the drawer content
        if (this.props.currentChannelId && !prevProps.currentChannelId) {
            EventEmitter.emit('renderDrawer');
        }

        if (this.props.currentChannelId && this.props.currentChannelId !== prevProps.currentChannelId) {
            this.updateNativeScrollView();
        }
    }

    componentWillUnmount() {
        EventEmitter.off('leave_team', this.handleLeaveTeam);
    }

    blurPostTextBox = () => {
        if (this.postTextbox?.current) {
            this.postTextbox.current.blur();
        }
    };

    channelLoaderDimensions = () => {
        const {isLandscape} = this.props;
        let top = 0;
        let {height} = Dimensions.get('window');
        switch (Platform.OS) {
        case 'android':
            if (isLandscape) {
                top = ANDROID_TOP_LANDSCAPE;
            } else {
                top = ANDROID_TOP_PORTRAIT;
                height -= 84;
            }
            break;
        case 'ios':
            if (isLandscape) {
                top = IOS_TOP_LANDSCAPE;
            } else {
                height = DeviceTypes.IS_IPHONE_X ? (height - IOSX_TOP_PORTRAIT) : (height - IOS_TOP_PORTRAIT);
                top = DeviceTypes.IS_IPHONE_X ? IOSX_TOP_PORTRAIT : IOS_TOP_PORTRAIT;
            }
            break;
        }

        return {height, top};
    };

    channelSidebarRef = (ref) => {
        if (ref) {
            this.channelSidebar = ref;
        }
    };

    settingsSidebarRef = (ref) => {
        if (ref) {
            this.settingsSidebar = ref;
        }
    };

    showTermsOfServiceModal = async () => {
        const {navigator, theme} = this.props;
        const closeButton = await MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor);
        navigator.showModal({
            screen: 'TermsOfService',
            animationType: 'slide-up',
            title: '',
            backButtonTitle: '',
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.centerChannelColor,
                navBarBackgroundColor: theme.centerChannelBg,
                navBarButtonColor: theme.buttonBg,
                screenBackgroundColor: theme.centerChannelBg,
                modalPresentationStyle: 'overCurrentContext',
            },
            overrideBackPress: true,
            passProps: {
                closeButton,
            },
        });
    };

    goToChannelInfo = preventDoubleTap(() => {
        const {intl} = this.context;
        const {navigator, theme} = this.props;
        const options = {
            screen: 'ChannelInfo',
            title: intl.formatMessage({id: 'mobile.routes.channelInfo', defaultMessage: 'Info'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        };

        Keyboard.dismiss();

        if (Platform.OS === 'android') {
            navigator.showModal(options);
        } else {
            requestAnimationFrame(() => {
                navigator.push(options);
            });
        }
    });

    handleAutoComplete = (value) => {
        if (this.postTextbox?.current) {
            this.postTextbox.current.handleTextChange(value, true);
        }
    };

    handleLeaveTeam = () => {
        this.props.actions.selectDefaultTeam();
    };

    loadChannels = (teamId) => {
        const {
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectInitialChannel,
        } = this.props.actions;

        loadChannelsIfNecessary(teamId).then(() => {
            loadProfilesAndTeamMembersForDMSidebar(teamId);

            if (app.startAppFromPushNotification) {
                app.setStartAppFromPushNotification(false);
            } else {
                selectInitialChannel(teamId);
            }
        });
    };

    openChannelSidebar = () => {
        if (this.channelSidebar) {
            this.channelSidebar.openChannelSidebar();
        }
    };

    openSettingsSidebar = () => {
        if (this.settingsSidebar) {
            this.settingsSidebar.openSettingsSidebar();
        }
    };

    retryLoadChannels = () => {
        this.loadChannels(this.props.currentTeamId);
    };

    updateNativeScrollView = () => {
        if (this.keyboardTracker?.current) {
            this.keyboardTracker.current.resetScrollView(this.props.currentChannelId);
        }
    };

    render() {
        const {
            channelsRequestFailed,
            currentChannelId,
            isLandscape,
            navigator,
            theme,
        } = this.props;

        if (!currentChannelId) {
            if (channelsRequestFailed) {
                const PostListRetry = require('app/components/post_list_retry').default;
                return (
                    <PostListRetry
                        retry={this.retryLoadChannels}
                        theme={theme}
                    />
                );
            }

            const Loading = require('app/components/channel_loader').default;
            return (
                <SafeAreaView navigator={navigator}>
                    <View style={style.flex}>
                        <EmptyToolbar
                            theme={theme}
                            isLandscape={this.props.isLandscape}
                        />
                        <Loading channelIsLoading={true}/>
                    </View>
                </SafeAreaView>
            );
        }

        const loaderDimensions = this.channelLoaderDimensions();

        return (
            <MainSidebar
                ref={this.channelSidebarRef}
                blurPostTextBox={this.blurPostTextBox}
                navigator={navigator}
            >
                <SettingsSidebar
                    ref={this.settingsSidebarRef}
                    blurPostTextBox={this.blurPostTextBox}
                    navigator={navigator}
                >
                    <SafeAreaView navigator={navigator}>
                        <StatusBar/>
                        <NetworkIndicator/>
                        <ChannelNavBar
                            navigator={navigator}
                            openChannelDrawer={this.openChannelSidebar}
                            openSettingsDrawer={this.openSettingsSidebar}
                            onPress={this.goToChannelInfo}
                        />
                        <ChannelPostList
                            navigator={navigator}
                            updateNativeScrollView={this.updateNativeScrollView}
                        />
                        <FileUploadPreview channelId={currentChannelId}/>
                        <Autocomplete
                            maxHeight={AUTOCOMPLETE_MAX_HEIGHT}
                            onChangeText={this.handleAutoComplete}
                            cursorPositionEvent={CHANNEL_POST_TEXTBOX_CURSOR_CHANGE}
                            valueEvent={CHANNEL_POST_TEXTBOX_VALUE_CHANGE}
                        />
                        <ChannelLoader
                            style={[style.channelLoader, loaderDimensions]}
                            maxRows={isLandscape ? 4 : 6}
                        />
                        {LocalConfig.EnableMobileClientUpgrade && <ClientUpgradeListener navigator={navigator}/>}
                    </SafeAreaView>
                    <KeyboardTrackingView
                        ref={this.keyboardTracker}
                        scrollViewNativeID={currentChannelId}
                    >
                        <PostTextbox
                            cursorPositionEvent={CHANNEL_POST_TEXTBOX_CURSOR_CHANGE}
                            valueEvent={CHANNEL_POST_TEXTBOX_VALUE_CHANGE}
                            ref={this.postTextbox}
                            navigator={navigator}
                        />
                    </KeyboardTrackingView>
                </SettingsSidebar>
                <InteractiveDialogController
                    navigator={navigator}
                    theme={theme}
                />
            </MainSidebar>
        );
    }
}

const style = StyleSheet.create({
    flex: {
        flex: 1,
    },
    channelLoader: {
        position: 'absolute',
        width: '100%',
        flex: 1,
    },
});
