// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Alert,
    Keyboard,
    Linking,
    StyleSheet,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {showModal, showModalOverCurrentContext} from '@actions/navigation';
import LocalConfig from '@assets/config';
import {NavigationTypes, ViewTypes} from '@constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import EphemeralStore from '@store/ephemeral_store';
import {preventDoubleTap} from '@utils/tap';
import {setNavigatorStyles} from '@utils/theme';
import tracker from '@utils/time_tracker';

import PushNotifications from 'app/push_notifications';
import telemetry from 'app/telemetry';

export let ClientUpgradeListener;

export default class ChannelBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getChannelStats: PropTypes.func.isRequired,
            loadChannelsForTeam: PropTypes.func.isRequired,
            selectDefaultTeam: PropTypes.func.isRequired,
            selectInitialChannel: PropTypes.func.isRequired,
            recordLoadTime: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string,
        currentTeamId: PropTypes.string,
        disableTermsModal: PropTypes.bool,
        isSupportedServer: PropTypes.bool,
        teamName: PropTypes.string,
        theme: PropTypes.object.isRequired,
        showTermsOfService: PropTypes.bool,
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

        this.postDraft = React.createRef();
        this.keyboardTracker = React.createRef();

        this.state = {
            channelsRequestFailed: false,
        };

        if (LocalConfig.EnableMobileClientUpgrade && !ClientUpgradeListener) {
            ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
        }
    }

    componentDidMount() {
        const {
            actions,
            currentChannelId,
            currentTeamId,
            disableTermsModal,
            isSupportedServer,
            showTermsOfService,
            skipMetrics,
        } = this.props;
        EventEmitter.on(NavigationTypes.BLUR_POST_DRAFT, this.blurPostDraft);
        EventEmitter.on('leave_team', this.handleLeaveTeam);

        if (currentTeamId) {
            this.loadChannels(currentTeamId);
        } else {
            actions.selectDefaultTeam();
        }

        if (currentChannelId) {
            PushNotifications.clearChannelNotifications(currentChannelId);
            requestAnimationFrame(() => {
                actions.getChannelStats(currentChannelId);
            });
        }

        if (tracker.initialLoad && !skipMetrics) {
            actions.recordLoadTime('Start time', 'initialLoad');
        }

        if (showTermsOfService && !disableTermsModal) {
            this.showTermsOfServiceModal();
        } else if (!isSupportedServer) {
            // Only display the Alert if the TOS does not need to show first
            this.showUnsupportedServer();
        }

        if (!skipMetrics) {
            telemetry.end(['start:channel_screen']);
        }
    }

    componentDidUpdate(prevProps) {
        if (tracker.teamSwitch) {
            this.props.actions.recordLoadTime('Switch Team', 'teamSwitch');
        }

        if (this.props.theme !== prevProps.theme) {
            setNavigatorStyles(this.props.componentId, this.props.theme);
            EphemeralStore.allNavigationComponentIds.forEach((componentId) => {
                if (this.props.componentId !== componentId) {
                    setNavigatorStyles(componentId, this.props.theme);
                }
            });
        }

        if (this.props.currentTeamId &&
            (!this.props.currentChannelId || this.props.currentTeamId !== prevProps.currentTeamId)) {
            this.loadChannels(this.props.currentTeamId);
        }

        if (this.props.currentChannelId && this.props.currentChannelId !== prevProps.currentChannelId) {
            PushNotifications.clearChannelNotifications(this.props.currentChannelId);

            requestAnimationFrame(() => {
                this.props.actions.getChannelStats(this.props.currentChannelId);
                this.updateNativeScrollView();
            });
        }

        if (LocalConfig.EnableMobileClientUpgrade && !ClientUpgradeListener) {
            ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
        }
    }

    componentWillUnmount() {
        EventEmitter.off(NavigationTypes.BLUR_POST_DRAFT, this.blurPostDraft);
        EventEmitter.off('leave_team', this.handleLeaveTeam);
    }

    blurPostDraft = () => {
        if (this.postDraft?.current) {
            this.postDraft.current.blurTextBox();
        }
    };

    goToChannelInfo = preventDoubleTap(() => {
        const {intl} = this.context;
        const {theme} = this.props;
        const screen = 'ChannelInfo';
        const title = intl.formatMessage({id: 'mobile.routes.channelInfo', defaultMessage: 'Info'});
        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
            const options = {
                topBar: {
                    leftButtons: [{
                        id: 'close-info',
                        icon: source,
                    }],
                },
            };

            Keyboard.dismiss();

            showModal(screen, title, null, options);
        });
    }, 1000);

    handleLeaveTeam = () => {
        this.props.actions.selectDefaultTeam();
    };

    loadChannels = (teamId) => {
        const {loadChannelsForTeam, selectInitialChannel} = this.props.actions;
        if (!EphemeralStore.getStartFromNotification()) {
            loadChannelsForTeam(teamId).then((result) => {
                if (result?.error) {
                    this.setState({channelsRequestFailed: true});
                    return;
                }

                this.setState({channelsRequestFailed: false});
                selectInitialChannel(teamId);
            });
        }
    };

    retryLoadChannels = () => {
        this.loadChannels(this.props.currentTeamId);
    };

    renderLoadingOrFailedChannel() {
        const {formatMessage} = this.context.intl;
        const {
            currentChannelId,
            teamName,
            theme,
        } = this.props;

        const {channelsRequestFailed} = this.state;
        if (!currentChannelId) {
            if (channelsRequestFailed) {
                const FailedNetworkAction = require('app/components/failed_network_action').default;
                const title = formatMessage({id: 'mobile.failed_network_action.teams_title', defaultMessage: 'Something went wrong'});
                const message = formatMessage({
                    id: 'mobile.failed_network_action.teams_channel_description',
                    defaultMessage: 'Channels could not be loaded for {teamName}.',
                }, {teamName});

                return (
                    <FailedNetworkAction
                        errorMessage={message}
                        errorTitle={title}
                        onRetry={this.retryLoadChannels}
                        theme={theme}
                    />
                );
            }

            const Loading = require('app/components/channel_loader').default;
            return (
                <Loading
                    channelIsLoading={true}
                    color={theme.centerChannelColor}
                />
            );
        }

        return null;
    }

    showTermsOfServiceModal = async () => {
        const {intl} = this.context;
        const {isSupportedServer, theme} = this.props;
        const screen = 'TermsOfService';
        const title = intl.formatMessage({id: 'mobile.tos_link', defaultMessage: 'Terms of Service'});
        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((closeButton) => {
            const passProps = {
                closeButton,
                isSupportedServer,
                showUnsupportedServer: this.showUnsupportedServer,
            };
            const options = {
                layout: {
                    componentBackgroundColor: theme.centerChannelBg,
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

            showModalOverCurrentContext(screen, passProps, options);
        });
    };

    showUnsupportedServer = () => {
        const {formatMessage} = this.context.intl;
        const title = formatMessage({id: 'mobile.server_upgrade.title', defaultMessage: 'Server upgrade required'});
        const message = formatMessage({
            id: 'mobile.server_upgrade.alert_description',
            defaultMessage: 'This server version is unsupported and users will be exposed to compatibility issues that cause crashes or severe bugs breaking core functionality of the app. Upgrading to server version {serverVersion} or later is required.',
        }, {serverVersion: ViewTypes.RequiredServer.FULL_VERSION});
        const cancel = {
            text: formatMessage({id: 'mobile.server_upgrade.cancel', defaultMessage: 'Cancel'}),
            style: 'cancel',
        };
        const learnMore = {
            text: formatMessage({id: 'mobile.server_upgrade.learn_more', defaultMessage: 'Learn More'}),
            onPress: () => {
                const url = 'https://mattermost.com/blog/support-for-esr-5-9-has-ended/';
                if (Linking.canOpenURL(url)) {
                    Linking.openURL(url);
                }
            },
        };
        const buttons = [cancel, learnMore];
        const options = {cancelable: false};

        Alert.alert(title, message, buttons, options);
    };

    updateNativeScrollView = () => {
        if (this.keyboardTracker?.current) {
            this.keyboardTracker.current.resetScrollView(this.props.currentChannelId);
        }
    };

    render() {
        // Overriden in channel.android.js and channel.ios.js
        // but defined here for channel_base.test.js
        return; // eslint-disable-line no-useless-return
    }
}

export const style = StyleSheet.create({
    flex: {
        flex: 1,
    },
});
