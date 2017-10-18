// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Animated,
    Linking,
    TouchableOpacity,
    View
} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';

import FormattedText from 'app/components/formatted_text';
import {UpgradeTypes} from 'app/constants/view';
import checkUpgradeType from 'app/utils/client_upgrade';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const {View: AnimatedView} = Animated;

const UPDATE_TIMEOUT = 60000;

class ClientUpgradeListener extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            logError: PropTypes.func.isRequired,
            setLastUpgradeCheck: PropTypes.func.isRequired
        }).isRequired,
        currentVersion: PropTypes.string,
        downloadLink: PropTypes.string,
        forceUpgrade: PropTypes.bool,
        intl: intlShape.isRequired,
        lastUpgradeCheck: PropTypes.number,
        latestVersion: PropTypes.string,
        minVersion: PropTypes.string,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    state = {
        top: new Animated.Value(-100)
    }

    componentDidMount() {
        const {forceUpgrade, lastUpgradeCheck, latestVersion, minVersion} = this.props;
        if (forceUpgrade || Date.now() - lastUpgradeCheck > UPDATE_TIMEOUT) {
            this.checkUpgrade(minVersion, latestVersion);
        }
    }

    componentWillReceiveProps(nextProps) {
        const {forceUpgrade, latestVersion, minVersion} = this.props;
        const {latestVersion: nextLatestVersion, minVersion: nextMinVersion, lastUpgradeCheck} = nextProps;

        const versionMismatch = latestVersion !== nextLatestVersion || minVersion !== nextMinVersion;
        if (versionMismatch && (forceUpgrade || Date.now() - lastUpgradeCheck > UPDATE_TIMEOUT)) {
            this.checkUpgrade(minVersion, latestVersion);
        }
    }

    checkUpgrade = (minVersion, latestVersion) => {
        const {actions, currentVersion} = this.props;

        const upgradeType = checkUpgradeType(currentVersion, minVersion, latestVersion, actions.logError);

        if (upgradeType === UpgradeTypes.NO_UPGRADE) {
            return;
        }

        this.setState({upgradeType});

        setTimeout(this.toggleUpgradeMessage, 500);

        actions.setLastUpgradeCheck();
    }

    toggleUpgradeMessage = (show = true) => {
        const toValue = show ? 75 : -100;
        Animated.timing(this.state.top, {
            toValue,
            duration: 300
        }).start();
    }

    handleDismiss = () => {
        this.toggleUpgradeMessage(false);
    }

    handleDownload = () => {
        const {downloadLink, intl} = this.props;

        Linking.canOpenURL(downloadLink).then((supported) => {
            if (supported) {
                return Linking.openURL(downloadLink);
            }

            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.client_upgrade.download_error.title',
                    defaultMessage: 'Upgrade Error'
                }),
                intl.formatMessage({
                    id: 'mobile.client_upgrade.download_error.message',
                    defaultMessage: 'An error occurred while trying to open the download link.'
                })
            );

            return false;
        });

        this.toggleUpgradeMessage(false);
    }

    handleLeanMore = () => {
        this.props.navigator.dismissAllModals({animationType: 'none'});

        this.props.navigator.showModal({
            screen: 'ClientUpgrade',
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: true,
                statusBarHideWithNavBar: true
            },
            passProps: {
                upgradeType: this.state.upgradeType
            }
        });

        this.toggleUpgradeMessage(false);
    }

    render() {
        const {forceUpgrade, theme} = this.props;
        const styles = getStyleSheet(theme);

        return (
            <AnimatedView
                style={[styles.wrapper, {top: this.state.top}]}
            >
                <View style={styles.container}>
                    <View style={styles.message}>
                        <FormattedText
                            id='mobile.client_upgrade.listener.message'
                            defaultMessage='A client upgrade is available!'
                            style={styles.messageText}
                        />
                    </View>
                    <View style={styles.bottom}>
                        <TouchableOpacity onPress={this.handleDownload}>
                            <FormattedText
                                style={styles.button}
                                id='mobile.client_upgrade.listener.upgrade_button'
                                defaultMessage='Upgrade'
                            />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={this.handleLeanMore}>
                            <FormattedText
                                style={styles.button}
                                id='mobile.client_upgrade.listener.learn_more_button'
                                defaultMessage='Learn More'
                            />
                        </TouchableOpacity>
                        {!forceUpgrade &&
                            <TouchableOpacity onPress={this.handleDismiss}>
                                <FormattedText
                                    style={styles.button}
                                    id='mobile.client_upgrade.listener.dismiss_button'
                                    defaultMessage='Dismiss'
                                />
                            </TouchableOpacity>
                        }
                    </View>
                </View>
            </AnimatedView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        bottom: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            borderTopWidth: 1
        },
        button: {
            color: theme.linkColor,
            fontSize: 13,
            paddingHorizontal: 5,
            paddingVertical: 5
        },
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.8),
            borderRadius: 5
        },
        message: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
        messageText: {
            fontSize: 16,
            color: changeOpacity(theme.centerChannelColor, 0.8),
            fontWeight: '600'
        },
        wrapper: {
            position: 'absolute',
            elevation: 5,
            left: 30,
            right: 30,
            height: 75,
            backgroundColor: 'white',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 2,
            borderRadius: 5,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 3
            },
            shadowOpacity: 0.2,
            shadowRadius: 2
        }
    };
});

export default injectIntl(ClientUpgradeListener);
