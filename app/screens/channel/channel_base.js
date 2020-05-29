// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Keyboard,
    StyleSheet,
    Animated,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {showModal, showModalOverCurrentContext} from '@actions/navigation';
import LocalConfig from '@assets/config';
import {NavigationTypes} from '@constants';
import {TYPING_VISIBLE} from '@constants/post_draft';
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

        this.typingAnimations = [];
    }

    componentDidMount() {
        EventEmitter.on(NavigationTypes.BLUR_POST_DRAFT, this.blurPostDraft);
        EventEmitter.on('leave_team', this.handleLeaveTeam);
        EventEmitter.on(TYPING_VISIBLE, this.runTypingAnimations);

        if (this.props.currentTeamId) {
            this.loadChannels(this.props.currentTeamId);
        } else {
            this.props.actions.selectDefaultTeam();
        }

        if (this.props.currentChannelId) {
            PushNotifications.clearChannelNotifications(this.props.currentChannelId);
            requestAnimationFrame(() => {
                this.props.actions.getChannelStats(this.props.currentChannelId);
            });
        }

        if (tracker.initialLoad && !this.props.skipMetrics) {
            this.props.actions.recordLoadTime('Start time', 'initialLoad');
        }

        if (this.props.showTermsOfService && !this.props.disableTermsModal) {
            this.showTermsOfServiceModal();
        }

        if (!this.props.skipMetrics) {
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
        EventEmitter.off(TYPING_VISIBLE, this.runTypingAnimations);
    }

    registerTypingAnimation = (animation) => {
        this.typingAnimations.push(animation);
    }

    runTypingAnimations = (typingVisible) => {
        Animated.parallel(
            this.typingAnimations.map((animation) => animation(typingVisible)),
        ).start();
    }

    blurPostDraft = () => {
        if (this.postDraft?.current) {
            this.postDraft.current.blurTextBox();
        }
    };

    showTermsOfServiceModal = async () => {
        const {intl} = this.context;
        const {theme} = this.props;
        const screen = 'TermsOfService';
        const title = intl.formatMessage({id: 'mobile.tos_link', defaultMessage: 'Terms of Service'});
        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((closeButton) => {
            const passProps = {closeButton};
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
