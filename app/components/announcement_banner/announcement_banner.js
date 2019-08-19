// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import RemoveMarkdown from 'app/components/remove_markdown';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

const {View: AnimatedView} = Animated;

export default class AnnouncementBanner extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            goToScreen: PropTypes.func.isRequired,
        }).isRequired,
        bannerColor: PropTypes.string,
        bannerDismissed: PropTypes.bool,
        bannerEnabled: PropTypes.bool,
        bannerText: PropTypes.string,
        bannerTextColor: PropTypes.string,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
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
            this.props.bannerDismissed !== nextProps.bannerDismissed
        ) {
            const showBanner = nextProps.bannerEnabled && !nextProps.bannerDismissed && Boolean(nextProps.bannerText);
            this.toggleBanner(showBanner);
        }
    }

    handlePress = () => {
        const {actions} = this.props;
        const {intl} = this.context;

        const screen = 'ExpandedAnnouncementBanner';
        const title = intl.formatMessage({
            id: 'mobile.announcement_banner.title',
            defaultMessage: 'Announcement',
        });

        actions.goToScreen(screen, title);
    };

    toggleBanner = (show = true) => {
        const value = show ? 38 : 0;
        Animated.timing(this.state.bannerHeight, {
            toValue: value,
            duration: 350,
        }).start();
    };

    render() {
        if (!this.props.bannerEnabled) {
            return null;
        }

        const {bannerHeight} = this.state;
        const {
            bannerColor,
            bannerText,
            bannerTextColor,
            isLandscape,
        } = this.props;

        const bannerStyle = {
            backgroundColor: bannerColor,
            height: bannerHeight,
        };

        const bannerTextStyle = {
            color: bannerTextColor,
        };

        return (
            <AnimatedView
                style={[style.bannerContainer, bannerStyle]}
            >
                <TouchableOpacity
                    onPress={this.handlePress}
                    style={[style.wrapper, padding(isLandscape)]}
                >
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={[style.bannerText, bannerTextStyle]}
                    >
                        <RemoveMarkdown value={bannerText}/>
                    </Text>
                    <MaterialIcons
                        color={bannerTextColor}
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
