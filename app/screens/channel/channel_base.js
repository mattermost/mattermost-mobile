// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Keyboard,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {app} from 'app/mattermost';

import EmptyToolbar from 'app/components/start/empty_toolbar';
import InteractiveDialogController from 'app/components/interactive_dialog_controller';
import MainSidebar from 'app/components/sidebars/main';
import SafeAreaView from 'app/components/safe_area_view';
import SettingsSidebar from 'app/components/sidebars/settings';

import {preventDoubleTap} from 'app/utils/tap';
import PushNotifications from 'app/push_notifications';
import tracker from 'app/utils/time_tracker';
import telemetry from 'app/telemetry';

import LocalConfig from 'assets/config';

export let ClientUpgradeListener;

export default class ChannelBase extends PureComponent {
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

    renderChannel(drawerContent) {
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
                            isLandscape={isLandscape}
                        />
                        <Loading channelIsLoading={true}/>
                    </View>
                </SafeAreaView>
            );
        }

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
                    {drawerContent}
                </SettingsSidebar>
                <InteractiveDialogController
                    navigator={navigator}
                    theme={theme}
                />
            </MainSidebar>
        );
    }
}

export const style = StyleSheet.create({
    flex: {
        flex: 1,
    },
    channelLoader: {
        position: 'absolute',
        width: '100%',
        flex: 1,
    },
    iOSHomeIndicator: {
        paddingBottom: 5,
    },
});
