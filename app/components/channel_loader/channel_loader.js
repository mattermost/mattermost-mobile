// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View,
    Animated,
    Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const GRADIENT_START_END = 0;
const GRADIENT_MIDDLE = 0.8;

const START_VALUE = 0;
const MIDDLE_VALUE = 50;
const END_VALUE = 100;
const DURATION = 2000;

export default class ChannelLoader extends PureComponent {
    static propTypes = {
        channelIsLoading: PropTypes.bool.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
    };

    constructor() {
        super();
        this.animation = new Animated.Value(0);
    }

    componentDidMount() {
        if (this.props.channelIsLoading) {
            this.start();
        }
    }

    componentWillUnmount() {
        this.animation.stopAnimation();
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.channelIsLoading !== this.props.channelIsLoading) {
            if (nextProps.channelIsLoading) {
                this.start();
            } else {
                this.animation.stopAnimation();
            }
        }
    }

    start() {
        this.animation.setValue(START_VALUE);
        Animated.sequence([
            Animated.timing(this.animation, {
                toValue: END_VALUE,
                duration: DURATION,
                easing: Easing.linear,
            }),
        ]).start((animation) => {
            if (animation.finished) {
                this.start();
            }
        });
    }

    buildSections({key, style, top, bg}) {
        const left = this.animation.interpolate({
            inputRange: [START_VALUE, END_VALUE],
            outputRange: ['-10%', '50%'],
        });

        const opacity = this.animation.interpolate({
            inputRange: [START_VALUE, MIDDLE_VALUE, END_VALUE],
            outputRange: [GRADIENT_START_END, GRADIENT_MIDDLE, GRADIENT_START_END],
        });

        const bodyPosLeft = this.animation.interpolate({
            inputRange: [START_VALUE, END_VALUE],
            outputRange: ['-20%', '80%'],
        });

        const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

        return (
            <View
                key={key}
                style={[style.section, (top && {marginTop: Platform.OS === 'android' ? 0 : -15, paddingTop: 10})]}
            >
                <View style={style.avatar}/>
                <View style={style.sectionMessage}>
                    <View>
                        <View style={[style.messageText]}/>
                        <AnimatedGradient
                            start={{x: 0.0, y: 1.0}}
                            end={{x: 1.0, y: 1.0}}
                            colors={[
                                changeOpacity(bg, GRADIENT_START_END),
                                changeOpacity(bg, GRADIENT_MIDDLE),
                                changeOpacity(bg, GRADIENT_START_END),
                            ]}
                            locations={[0, 0.5, 1]}
                            style={[style.gradientText, {left, opacity}]}
                        />
                    </View>
                    <View>
                        <View style={[style.messageText, {width: '100%'}]}/>
                        <AnimatedGradient
                            start={{x: 0.0, y: 1.0}}
                            end={{x: 1.0, y: 1.0}}
                            colors={[
                                changeOpacity(bg, GRADIENT_START_END),
                                changeOpacity(bg, GRADIENT_MIDDLE),
                                changeOpacity(bg, GRADIENT_START_END),
                            ]}
                            locations={[0, 0.5, 1]}
                            style={[style.gradientText, {left: bodyPosLeft, opacity}]}
                        />
                    </View>
                    <View>
                        <View style={[style.messageText, {width: '100%'}]}/>
                        <AnimatedGradient
                            start={{x: 0.0, y: 1.0}}
                            end={{x: 1.0, y: 1.0}}
                            colors={[
                                changeOpacity(bg, GRADIENT_START_END),
                                changeOpacity(bg, GRADIENT_MIDDLE),
                                changeOpacity(bg, GRADIENT_START_END),
                            ]}
                            locations={[0, 0.5, 1]}
                            style={[style.gradientText, {left: bodyPosLeft, opacity}]}
                        />
                    </View>
                </View>
            </View>
        );
    }

    render() {
        const {channelIsLoading, deviceWidth, theme} = this.props;

        if (!channelIsLoading) {
            return null;
        }

        const style = getStyleSheet(theme);

        return (
            <View style={[style.container, {width: deviceWidth}]}>
                {Array(20).fill().map((item, index) => this.buildSections({key: index, style, top: index === 0, bg: theme.centerChannelBg}))}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
            position: 'absolute',
            ...Platform.select({
                android: {
                    top: 0,
                },
                ios: {
                    top: 15,
                },
            }),
        },
        avatar: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 16,
            height: 32,
            width: 32,
        },
        gradientText: {
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.2),
            height: 10,
            marginBottom: 10,
            position: 'absolute',
            width: '40%',
        },
        section: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            paddingLeft: 12,
            paddingRight: 20,
            marginVertical: 10,
        },
        sectionMessage: {
            marginLeft: 12,
            flex: 1,
        },
        messageText: {
            width: '80%',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 10,
            marginBottom: 10,
        },
    };
});
