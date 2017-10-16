// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableWithoutFeedback,
    View,
    ViewPropTypes
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import AboveIcon from './above_icon';

export const SHOULD_SHOW_EVENT = 'show_unread_indicator';
export const SET_WITDH = 'set_unread_indicator_width';

export default class UnreadIndicator extends PureComponent {
    static propTypes = {
        style: ViewPropTypes.style,
        onPress: PropTypes.func,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onPress: () => true
    };

    state = {
        show: false,
        width: null
    };

    componentWillMount() {
        EventEmitter.on(SET_WITDH, this.handleWidthChange);
        EventEmitter.on(SHOULD_SHOW_EVENT, this.handleShowChange);
    }

    componentWillUnmount() {
        EventEmitter.off(SET_WITDH, this.handleWidthChange);
        EventEmitter.off(SHOULD_SHOW_EVENT, this.handleShowChange);
    }

    handleWidthChange = (width) => {
        this.setState({width});
    };

    handleShowChange = (show) => {
        if (this.state.show !== show) {
            this.setState({show});
        }
    };

    render() {
        const {show, width} = this.state;
        const {onPress, theme} = this.props;

        if (!width || !show) {
            return null;
        }

        const style = getStyleSheet(theme);

        return (
            <TouchableWithoutFeedback onPress={onPress}>
                <View
                    style={[style.container, this.props.style, {width}]}
                >
                    <FormattedText
                        style={style.indicatorText}
                        id='sidebar.unreads'
                        defaultMessage='More unreads'
                    />
                    <AboveIcon
                        width={12}
                        height={12}
                        color={theme.mentionColor}
                    />
                </View>
            </TouchableWithoutFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            position: 'absolute',
            borderRadius: 15,
            marginHorizontal: 15,
            height: 25
        },
        indicatorText: {
            backgroundColor: 'transparent',
            color: theme.mentionColor,
            fontSize: 14,
            paddingVertical: 2,
            paddingHorizontal: 4,
            textAlign: 'center',
            textAlignVertical: 'center'
        }
    };
});
