// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    InteractionManager,
    StyleSheet,
    Text,
    TouchableOpacity,
} from 'react-native';
import {intlShape} from 'react-intl';

import CompassIcon from '@components/compass_icon';
import RemoveMarkdown from '@components/remove_markdown';
import {paddingHorizontal as padding} from '@components/safe_area_view/iphone_x_spacing';
import {goToScreen} from '@actions/navigation';

const {View: AnimatedView} = Animated;

export default class AnnouncementBanner extends PureComponent {
    static propTypes = {
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

    componentDidMount() {
        const {bannerDismissed, bannerEnabled, bannerText} = this.props;
        const showBanner = bannerEnabled && !bannerDismissed && Boolean(bannerText);
        this.toggleBanner(showBanner);
    }

    componentDidUpdate(prevProps) {
        if (this.props.bannerText !== prevProps.bannerText ||
            this.props.bannerEnabled !== prevProps.bannerEnabled ||
            this.props.bannerDismissed !== prevProps.bannerDismissed
        ) {
            const showBanner = this.props.bannerEnabled && !this.props.bannerDismissed && Boolean(this.props.bannerText);
            this.toggleBanner(showBanner);
        }
    }

    handlePress = () => {
        const {intl} = this.context;

        const screen = 'ExpandedAnnouncementBanner';
        const title = intl.formatMessage({
            id: 'mobile.announcement_banner.title',
            defaultMessage: 'Announcement',
        });

        goToScreen(screen, title);
    };

    toggleBanner = (show = true) => {
        const value = show ? 38 : 0;
        if (show && !this.state.visible) {
            this.setState({visible: show});
        }

        InteractionManager.runAfterInteractions(() => {
            Animated.timing(this.state.bannerHeight, {
                toValue: value,
                duration: 350,
                useNativeDriver: false,
            }).start(() => {
                if (this.state.visible !== show) {
                    this.setState({visible: show});
                }
            });
        });
    };

    render() {
        if (!this.state.visible) {
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
                    <CompassIcon
                        color={bannerTextColor}
                        name='info-outline'
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
