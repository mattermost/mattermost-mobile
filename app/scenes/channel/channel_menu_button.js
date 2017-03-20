// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {getTheme} from 'app/selectors/preferences';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

class ChannelMenuButton extends PureComponent {
    static propTypes = {
        emitter: PropTypes.func.isRequired,
        theme: PropTypes.object
    };

    static defaultProps = {
        currentChannel: {},
        theme: {}
    };

    constructor(props) {
        super(props);

        this.state = {
            opacity: 1
        };
    }

    componentDidMount() {
        EventEmitter.on('drawer_opacity', this.setOpacity);
    }

    componentWillUnmount() {
        EventEmitter.off('drawer_opacity', this.setOpacity);
    }

    setOpacity = (value) => {
        this.setState({opacity: value > 0 ? 0.1 : 1});
    };

    render() {
        return (
            <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, opacity: this.state.opacity}}>
                <TouchableOpacity onPress={() => this.props.emitter('open_right_menu')}>
                    <Icon
                        name='ellipsis-v'
                        size={25}
                        color={this.props.theme.sidebarHeaderTextColor}
                        style={{paddingHorizontal: 20}}
                    />
                </TouchableOpacity>
            </View>
        );
    }
}

function mapStateToProps(state) {
    return {
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelMenuButton);
