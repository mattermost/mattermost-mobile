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
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {showModal, showModalOverCurrentContext} from 'app/actions/navigation';
import SafeAreaView from 'app/components/safe_area_view';
import EmptyToolbar from 'app/components/start/empty_toolbar';
import {NavigationTypes} from 'app/constants';
import PushNotifications from 'app/push_notifications';
import EphemeralStore from 'app/store/ephemeral_store';
import telemetry from 'app/telemetry';
import {preventDoubleTap} from 'app/utils/tap';
import {setNavigatorStyles} from 'app/utils/theme';
import tracker from 'app/utils/time_tracker';

import LocalConfig from 'assets/config';

export let ClientUpgradeListener;

export default class ChannelBase extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadChannelsForTeam: PropTypes.func.isRequired,
            selectDefaultTeam: PropTypes.func.isRequired,
            selectInitialChannel: PropTypes.func.isRequired,
            recordLoadTime: PropTypes.func.isRequired,
            getChannelStats: PropTypes.func.isRequired,
        }).isRequired,
        componentId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string,
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

        setNavigatorStyles(props.componentId, props.theme);

        this.state = {
            channelsRequestFailed: false,
        };

        if (LocalConfig.EnableMobileClientUpgrade && !ClientUpgradeListener) {
            ClientUpgradeListener = require('app/components/client_upgrade_listener').default;
        }
    }

    componentDidMount() {
        EventEmitter.on(NavigationTypes.BLUR_POST_TEXTBOX, this.blurPostTextBox);
        EventEmitter.on('leave_team', this.handleLeaveTeam);

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
                setNavigatorStyles(componentId, this.props.theme);
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
        EventEmitter.off(NavigationTypes.BLUR_POST_TEXTBOX, this.blurPostTextBox);
        EventEmitter.off('leave_team', this.handleLeaveTeam);
    }

    blurPostTextBox = () => {
        if (this.postTextbox?.current) {
            this.postTextbox.current.blur();
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
        const {
            currentChannelId,
            isLandscape,
            theme,
        } = this.props;

        const {channelsRequestFailed} = this.state;
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
                        <Loading
                            channelIsLoading={true}
                            color={theme.centerChannelColor}
                        />
                    </View>
                </SafeAreaView>
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
