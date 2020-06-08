// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    View,
    Dimensions,
} from 'react-native';
import * as RNPlaceholder from 'rn-placeholder';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

function calculateMaxRows(height) {
    return Math.round(height / 100);
}

function Media(color) {
    return (
        <RNPlaceholder.PlaceholderMedia
            color={changeOpacity(color, 0.15)}
            isRound={true}
            size={32}
            style={{marginRight: 10}}
        />
    );
}

export default class ChannelLoader extends PureComponent {
    static propTypes = {
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

    buildSections({key, style, bg, color}) {
        return (
            <View
                key={key}
                style={[style.section, {backgroundColor: bg}]}
            >
                <RNPlaceholder.Placeholder
                    Animation={(props) => (
                        <RNPlaceholder.Fade
                            {...props}
                            style={{backgroundColor: changeOpacity(bg, 0.9)}}
                        />
                    )}
                    Left={Media.bind(undefined, color)}
                    styles={{left: {color: changeOpacity(color, 0.15)}}}
                >
                    <RNPlaceholder.PlaceholderLine color={changeOpacity(color, 0.15)}/>
                    <RNPlaceholder.PlaceholderLine
                        color={changeOpacity(color, 0.15)}
                        width={80}
                    />
                    <RNPlaceholder.PlaceholderLine
                        color={changeOpacity(color, 0.15)}
                        width={60}
                    />
                </RNPlaceholder.Placeholder>
            </View>
        );
    }

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
            flex: 1,
            paddingLeft: 12,
            paddingRight: 20,
            marginVertical: 10,
        },
    };
});
