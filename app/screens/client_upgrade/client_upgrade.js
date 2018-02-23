// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Image,
    Linking,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';

import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {UpgradeTypes} from 'app/constants/view';
import logo from 'assets/images/logo.png';
import checkUpgradeType from 'app/utils/client_upgrade';
import {changeOpacity, makeStyleSheetFromTheme, setNavigatorStyles} from 'app/utils/theme';

export default class ClientUpgrade extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            logError: PropTypes.func.isRequired,
            setLastUpgradeCheck: PropTypes.func.isRequired,
        }).isRequired,
        currentVersion: PropTypes.string,
        closeAction: PropTypes.func,
        userCheckedForUpgrade: PropTypes.bool,
        downloadLink: PropTypes.string.isRequired,
        forceUpgrade: PropTypes.bool,
        latestVersion: PropTypes.string,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        upgradeType: PropTypes.string,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        this.state = {
            upgradeType: UpgradeTypes.NO_UPGRADE,
        };
    }

    componentDidMount() {
        if (this.props.userCheckedForUpgrade) {
            this.checkUpgrade(this.props);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.theme !== nextProps.theme) {
            setNavigatorStyles(this.props.navigator, nextProps.theme);
        }
    }

    checkUpgrade = ({minVersion, latestVersion}) => {
        const {actions, currentVersion, downloadLink} = this.props;

        // We need at least minVersion or latestVersion and the app downloadlink
        if (!(latestVersion || minVersion) || !downloadLink) {
            return;
        }

        const upgradeType = checkUpgradeType(currentVersion, minVersion, latestVersion, actions.logError);

        if (upgradeType === UpgradeTypes.NO_UPGRADE) {
            return;
        }

        this.setState({
            upgradeType,
        });

        actions.setLastUpgradeCheck();
    }

    handleClose = () => {
        if (this.props.closeAction) {
            this.props.closeAction();
        } else if (this.props.userCheckedForUpgrade) {
            this.props.navigator.pop();
        } else {
            this.props.navigator.dismissModal();
        }
    };

    handleDownload = () => {
        const {downloadLink} = this.props;
        const {intl} = this.context;

        Linking.canOpenURL(downloadLink).then((supported) => {
            if (supported) {
                return Linking.openURL(downloadLink);
            }

            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.client_upgrade.download_error.title',
                    defaultMessage: 'Upgrade Error',
                }),
                intl.formatMessage({
                    id: 'mobile.client_upgrade.download_error.message',
                    defaultMessage: 'An error occurred while trying to open the download link.',
                })
            );

            return false;
        });
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'close-upgrade') {
                this.props.navigator.dismissModal({
                    animationType: 'slide-down',
                });
            }
        }
    };

    renderMustUpgrade() {
        const {theme} = this.props;
        const styles = getStyleFromTheme(theme);

        return (
            <View style={styles.messageContent}>
                <FormattedText
                    id='mobile.client_upgrade.must_upgrade_title'
                    defaultMessage='Upgrade Required'
                    style={styles.messageTitle}
                />
                <FormattedText
                    id='mobile.client_upgrade.must_upgrade_subtitle'
                    defaultMessage='Please update the app to continue.'
                    style={styles.messageSubtitle}
                />
            </View>
        );
    }

    renderCanUpgrade() {
        const {theme} = this.props;
        const styles = getStyleFromTheme(theme);

        return (
            <View style={styles.messageContent}>
                <FormattedText
                    id='mobile.client_upgrade.can_upgrade_title'
                    defaultMessage='Upgrade Available!'
                    style={styles.messageTitle}
                />
                <FormattedText
                    id='mobile.client_upgrade.can_upgrade_subtitle'
                    defaultMessage={'There\'s a new upgrade ready for download.'}
                    style={styles.messageSubtitle}
                />
            </View>
        );
    }

    renderNoUpgrade() {
        const {theme} = this.props;
        const styles = getStyleFromTheme(theme);

        return (
            <View style={styles.messageContent}>
                <FormattedText
                    id='mobile.client_upgrade.no_upgrade_title'
                    defaultMessage='Your App Is Up to Date'
                    style={styles.messageTitle}
                />
                <FormattedText
                    id='mobile.client_upgrade.no_upgrade_subtitle'
                    defaultMessage={'You\'re already using the latest version.'}
                    style={styles.messageSubtitle}
                />
            </View>
        );
    }

    renderMessageContent = () => {
        const {currentVersion, forceUpgrade, latestVersion, upgradeType: passedUpgradeType, userCheckedForUpgrade, theme} = this.props;
        const styles = getStyleFromTheme(theme);
        const upgradeType = userCheckedForUpgrade ? this.state.upgradeType : passedUpgradeType;

        let messageComponent;

        switch (upgradeType) {
        case UpgradeTypes.CAN_UPGRADE:
            messageComponent = this.renderCanUpgrade();
            break;
        case UpgradeTypes.MUST_UPGRADE:
            messageComponent = this.renderMustUpgrade();
            break;
        default:
        case UpgradeTypes.NO_UPGRADE:
            messageComponent = this.renderNoUpgrade();
            break;
        }

        return (
            <View style={styles.messageContainer}>
                {messageComponent}
                <FormattedText
                    id='mobile.client_upgrade.current_version'
                    defaultMessage='Lastest Version: {version}'
                    style={styles.messageSubtitle}
                    values={{
                        version: latestVersion,
                    }}
                />
                <FormattedText
                    id='mobile.client_upgrade.latest_version'
                    defaultMessage='Your Version: {version}'
                    style={styles.messageSubtitle}
                    values={{
                        version: currentVersion,
                    }}
                />
                {upgradeType !== UpgradeTypes.NO_UPGRADE &&
                    <View>
                        <TouchableOpacity
                            onPress={this.handleDownload}
                            style={styles.messageButton}
                        >
                            <FormattedText
                                id='mobile.client_upgrade.upgrade'
                                defaultMessage='Upgrade'
                                style={styles.messageButtonText}
                            />
                        </TouchableOpacity>
                        {!forceUpgrade &&
                            <TouchableOpacity
                                onPress={this.handleClose}
                                style={styles.messageCloseButton}
                            >
                                <FormattedText
                                    id='mobile.client_upgrade.close'
                                    defaultMessage='Upgrade Later'
                                    style={styles.messageCloseButtonText}
                                />
                            </TouchableOpacity>
                        }
                    </View>
                }
            </View>
        );
    }

    render() {
        const {theme} = this.props;

        const styles = getStyleFromTheme(theme);

        return (
            <View style={styles.container}>
                <StatusBar/>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollViewContent}
                >
                    <Image
                        source={logo}
                        style={styles.image}
                    />
                    {this.renderMessageContent()}
                </ScrollView>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        image: {
            marginTop: 75,
            width: 76,
            height: 75,
        },
        messageButton: {
            marginBottom: 15,
            borderWidth: 2,
            borderRadius: 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: theme.buttonBg,
        },
        messageButtonText: {
            paddingVertical: 10,
            paddingHorizontal: 20,
            fontWeight: '600',
            color: theme.buttonBg,
        },
        messageContainer: {
            marginTop: 25,
            flex: 1,
            alignSelf: 'stretch',
            alignItems: 'center',
        },
        messageCloseButton: {
            marginBottom: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        messageSubtitle: {
            fontSize: 16,
            marginBottom: 20,
            color: theme.centerChannelColor,
            textAlign: 'center',
            paddingHorizontal: 30,
        },
        messageTitle: {
            fontSize: 24,
            marginBottom: 20,
            fontWeight: '600',
            color: theme.centerChannelColor,
            textAlign: 'center',
            paddingHorizontal: 30,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        scrollViewContent: {
            paddingBottom: 20,
            alignItems: 'center',
        },
    };
});
