// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    View,
} from 'react-native';
import Placeholder from 'rn-placeholder';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import CustomPropTypes from 'app/constants/custom_prop_types';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelLoader extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleSelectChannel: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired,
        }).isRequired,
        backgroundColor: PropTypes.string,
        channelIsLoading: PropTypes.bool.isRequired,
        maxRows: PropTypes.number,
        style: CustomPropTypes.Style,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        maxRows: 6,
    };

    state = {
        switch: false,
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        if (!nextProps.channelIsLoading && prevState.switch) {
            return {
                switch: false,
                channel: null,
            };
        }

        return null;
    }

    componentDidMount() {
        EventEmitter.on('switch_channel', this.handleChannelSwitch);
    }

    componentWillUnmount() {
        EventEmitter.off('switch_channel', this.handleChannelSwitch);
    }

    componentDidUpdate() {
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
            <View
                key={key}
                style={[style.section, {backgroundColor: bg}]}
            >
                <Placeholder.ImageContent
                    size={32}
                    animate='fade'
                    lineNumber={3}
                    lineSpacing={5}
                    firstLineWidth='80%'
                    hasRadius={true}
                    textSize={14}
                    color={changeOpacity(color, 0.2)}
                />
            </View>
        );
    }

    handleChannelSwitch = (channel, currentChannelId) => {
        if (channel.id === currentChannelId) {
            this.props.actions.setChannelLoading(false);
        } else {
            this.setState({switch: true, channel});
        }
    };

    render() {
        const {channelIsLoading, maxRows, style: styleProp, theme} = this.props;

        if (!channelIsLoading) {
            return null;
        }

        const style = getStyleSheet(theme);
        const bg = this.props.backgroundColor || theme.centerChannelBg;

        return (
            <View style={[style.container, styleProp, {backgroundColor: bg}]}>
                {Array(maxRows).fill().map((item, index) => this.buildSections({
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
            ...Platform.select({
                android: {
                    top: 0,
                },
                ios: {
                    paddingTop: 15,
                },
            }),
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
