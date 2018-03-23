// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Alert,
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {View: AnimatedView} = Animated;

export default class AnnouncementBanner extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            dismissBanner: PropTypes.func.isRequired,
        }).isRequired,
        allowDismissal: PropTypes.bool,
        bannerColor: PropTypes.string,
        bannerDismissed: PropTypes.bool,
        bannerEnabled: PropTypes.bool,
        bannerText: PropTypes.string,
        bannerTextColor: PropTypes.string,
    };

    static contextTypes = {
        intl: intlShape,
    };

    state = {
        bannerHeight: new Animated.Value(0),
    };

    componentWillMount() {
        const {bannerDismissed, bannerEnabled, bannerText} = this.props;
        const showBanner = bannerEnabled && !bannerDismissed && Boolean(bannerText);
        this.toggleBanner(showBanner);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.bannerText !== nextProps.bannerText ||
            this.props.bannerEnabled !== nextProps.bannerEnabled ||
            this.props.bannerDismissed !== nextProps.bannerDismissed) {
            const showBanner = nextProps.bannerEnabled && !nextProps.bannerDismissed && Boolean(nextProps.bannerText);
            this.toggleBanner(showBanner);
        }
    }

    handleDismiss = () => {
        const {actions, bannerText} = this.props;
        actions.dismissBanner(bannerText);
    };

    handlePress = () => {
        const {formatMessage} = this.context.intl;
        const options = [{
            text: formatMessage({id: 'mobile.announcement_banner.ok', defaultMessage: 'OK'}),
        }];

        if (this.props.allowDismissal) {
            options.push({
                text: formatMessage({id: 'mobile.announcement_banner.dismiss', defaultMessage: 'Dismiss'}),
                onPress: this.handleDismiss,
            });
        }

        Alert.alert(
            formatMessage({id: 'mobile.announcement_banner.title', defaultMessage: 'Announcement'}),
            this.props.bannerText,
            options,
            {cancelable: false}
        );
    };

    toggleBanner = (show = true) => {
        const value = show ? 38 : 0;
        Animated.timing(this.state.bannerHeight, {
            toValue: value,
            duration: 350,
        }).start();
    };

    render() {
        const {bannerHeight} = this.state;

        const bannerStyle = {
            backgroundColor: this.props.bannerColor,
            height: bannerHeight,
        };

        const bannerTextStyle = {
            color: this.props.bannerTextColor,
        };

        return (
            <AnimatedView
                style={[style.bannerContainer, bannerStyle]}
            >
                <TouchableOpacity
                    onPress={this.handlePress}
                    style={style.wrapper}
                >
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={[style.bannerText, bannerTextStyle]}
                    >
                        {this.props.bannerText}
                    </Text>
                    <MaterialIcons
                        color={this.props.bannerTextColor}
                        name='info'
                        size={16}
                    />
                </TouchableOpacity>
            </AnimatedView>
        );
    }
}

const style = StyleSheet.create({
    bannerContainer: {
        paddingHorizontal: 10,
        position: 'absolute',
        top: 0,
        overflow: 'hidden',
        width: '100%',
    },
    wrapper: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
    },
    bannerText: {
        flex: 1,
        fontSize: 14,
        marginRight: 5,
    },
});
