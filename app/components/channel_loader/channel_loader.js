// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    Easing,
    View,
    Dimensions,
} from 'react-native';
import {ImageContent} from 'rn-placeholder';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

const {View: AnimatedView} = Animated;

function calculateMaxRows(height) {
    return Math.round(height / 100);
}

export default class ChannelLoader extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleSelectChannel: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired,
        }).isRequired,
        backgroundColor: PropTypes.string,
        channelIsLoading: PropTypes.bool.isRequired,
        style: CustomPropTypes.Style,
        theme: PropTypes.object.isRequired,
        height: PropTypes.number,
        isLandscape: PropTypes.bool.isRequired,
    };

    constructor(props) {
        super(props);

        const height = props.height || Dimensions.get('window').height;
        const maxRows = calculateMaxRows(height);

        this.state = {
            barsOpacity: new Animated.Value(0.6),
            switch: false,
            maxRows,
        };
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const state = {};

        if (nextProps.height) {
            state.maxRows = calculateMaxRows(nextProps.height);
        }
        if (!nextProps.channelIsLoading && prevState.switch) {
            state.switch = false;
            state.channel = null;
        }

        return Object.keys(state) ? state : null;
    }

    componentDidMount() {
        EventEmitter.on('switch_channel', this.handleChannelSwitch);
    }

    componentWillUnmount() {
        EventEmitter.off('switch_channel', this.handleChannelSwitch);
    }

    startLoadingAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(this.state.barsOpacity, {
                    toValue: 1,
                    duration: 750,
                    easing: Easing.quad,
                    useNativeDriver: true,
                }),
                Animated.timing(this.state.barsOpacity, {
                    toValue: 0.6,
                    duration: 750,
                    easing: Easing.quad,
                    useNativeDriver: true,
                }),
            ]),
        ).start();
    };

    stopLoadingAnimation = () => {
        Animated.timing(
            this.state.barsOpacity
        ).stop();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.channelIsLoading === false && this.props.channelIsLoading === true) {
            this.startLoadingAnimation();
        } else if (prevProps.channelIsLoading === true && this.props.channelIsLoading === false) {
            this.stopLoadingAnimation();
        }

        if (this.state.switch) {
            const {
                handleSelectChannel,
                setChannelLoading,
            } = this.props.actions;

            const {channel} = this.state;

            setTimeout(() => {
                handleSelectChannel(channel.id);
                setChannelLoading(false);
            }, 250);
        }
    }

    buildSections({key, style, bg, color}) {
        return (
            <AnimatedView
                key={key}
                style={[style.section, {backgroundColor: bg}, {opacity: this.state.barsOpacity}]}
            >
                <ImageContent
                    size={32}
                    animate='fade'
                    lineNumber={3}
                    lineSpacing={5}
                    firstLineWidth='80%'
                    hasRadius={true}
                    textSize={14}
                    color={changeOpacity(color, 0.15)}
                />
            </AnimatedView>
        );
    }

    handleChannelSwitch = (channel, currentChannelId) => {
        if (channel.id === currentChannelId) {
            this.props.actions.setChannelLoading(false);
        } else {
            this.setState({switch: true, channel});
        }
    };

    handleLayout = (e) => {
        const {height} = e.nativeEvent.layout;
        const maxRows = calculateMaxRows(height);
        this.setState({maxRows});
    }

    render() {
        const {
            channelIsLoading,
            style: styleProp,
            theme,
            isLandscape,
        } = this.props;

        if (!channelIsLoading) {
            return null;
        }

        const style = getStyleSheet(theme);
        const bg = this.props.backgroundColor || theme.centerChannelBg;

        return (
            <View
                style={[style.container, styleProp, padding(isLandscape), {backgroundColor: bg}]}
                onLayout={this.handleLayout}
            >
                {Array(this.state.maxRows).fill().map((item, index) => this.buildSections({
                    key: index,
                    style,
                    bg,
                    color: theme.centerChannelColor,
                }))}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            overflow: 'hidden',
        },
        section: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            flex: 1,
            paddingLeft: 12,
            paddingRight: 20,
            marginVertical: 10,
        },
    };
});
