// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Keyboard,
    StyleSheet,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import EmptyToolbar from 'app/components/start/empty_toolbar';
import InteractiveDialogController from 'app/components/interactive_dialog_controller';
import MainSidebar from 'app/components/sidebars/main';
import SafeAreaView from 'app/components/safe_area_view';
import SettingsSidebar from 'app/components/sidebars/settings';

import {preventDoubleTap} from 'app/utils/tap';
import PushNotifications from 'app/push_notifications';
import EphemeralStore from 'app/store/ephemeral_store';
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
            peek: PropTypes.func.isRequired,
            goToScreen: PropTypes.func.isRequired,
            showModalOverCurrentContext: PropTypes.func.isRequired,
            getChannelStats: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string,
        channelsRequestFailed: PropTypes.bool,
        currentTeamId: PropTypes.string,
        isLandscape: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        showTermsOfService: PropTypes.bool,
        disableTermsModal: PropTypes.bool,
        skipMetrics: PropTypes.bool,
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

        Navigation.mergeOptions(props.componentId, {
            layout: {
                backgroundColor: props.theme.centerChannelBg,
            },
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
        if (tracker.initialLoad && !this.props.skipMetrics) {
            this.props.actions.recordLoadTime('Start time', 'initialLoad');
        }

        if (this.props.showTermsOfService && !this.props.disableTermsModal) {
            this.showTermsOfServiceModal();
        }

        EventEmitter.emit('renderDrawer');

        if (!this.props.skipMetrics) {
            telemetry.end(['start:channel_screen']);
        }

        this.props.actions.getChannelStats(this.props.currentChannelId);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            Navigation.mergeOptions(this.props.componentId, {
                layout: {
                    backgroundColor: nextProps.theme.centerChannelBg,
                },
            });
        }

        if (nextProps.currentTeamId && this.props.currentTeamId !== nextProps.currentTeamId) {
            this.loadChannels(nextProps.currentTeamId);
        }

        if (nextProps.currentChannelId !== this.props.currentChannelId &&
            nextProps.currentTeamId === this.props.currentTeamId) {
            PushNotifications.clearChannelNotifications(nextProps.currentChannelId);
        }

        if (nextProps.currentChannelId !== this.props.currentChannelId) {
            this.props.actions.getChannelStats(nextProps.currentChannelId);
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
        const {intl} = this.context;
        const {actions, theme} = this.props;
        const closeButton = await MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor);
        const screen = 'TermsOfService';
        const passProps = {closeButton};
        const title = intl.formatMessage({id: 'mobile.tos_link', defaultMessage: 'Terms of Service'});
        const options = {
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
            topBar: {
                visible: true,
                height: null,
                title: {
                    color: theme.sidebarHeaderTextColor,
                    text: title,
                },
            },
        };

        actions.showModalOverCurrentContext(screen, passProps, options);
    };

    goToChannelInfo = preventDoubleTap(() => {
        const {actions} = this.props;
        const {intl} = this.context;
        const screen = 'ChannelInfo';
        const title = intl.formatMessage({id: 'mobile.routes.channelInfo', defaultMessage: 'Info'});

        Keyboard.dismiss();

        requestAnimationFrame(() => {
            actions.goToScreen(screen, title);
        });
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

            if (EphemeralStore.appStartedFromPushNotification) {
                EphemeralStore.appStartedFromPushNotification = false;
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

    renderChannel(drawerContent, optionalProps = {}) {
        const {
            channelsRequestFailed,
            currentChannelId,
            isLandscape,
            theme,
        } = this.props;

        if (!currentChannelId) {
            if (channelsRequestFailed) {
                const FailedNetworkAction = require('app/components/failed_network_action').default;

                return (
                    <SafeAreaView>
                        <View style={style.flex}>
                            <EmptyToolbar
                                theme={theme}
                                isLandscape={isLandscape}
                            />
                            <FailedNetworkAction
                                onRetry={this.retryLoadChannels}
                                theme={theme}
                            />
                        </View>
                    </SafeAreaView>
                );
            }

            const Loading = require('app/components/channel_loader').default;
            return (
                <SafeAreaView>
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
                {...optionalProps}
            >
                <SettingsSidebar
                    ref={this.settingsSidebarRef}
                    blurPostTextBox={this.blurPostTextBox}
                >
                    {drawerContent}
                </SettingsSidebar>
                <InteractiveDialogController
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
        paddingBottom: 50,
    },
});
