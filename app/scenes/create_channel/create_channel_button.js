// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {connect} from 'react-redux';
import {
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';

import {getTheme} from 'service/selectors/entities/preferences';
import EventEmitter from 'service/utils/event_emitter';
import {changeOpacity} from 'app/utils/theme';

class CreateChannelButton extends PureComponent {
    static propTypes = {
        emitter: PropTypes.func.isRequired,
        theme: PropTypes.object
    };

    static defaultProps = {
        theme: {}
    };

    constructor(props) {
        super(props);

        this.state = {
            enabled: false,
            loading: false
        };
    }

    componentWillMount() {
        EventEmitter.on('can_create_channel', this.onCanCreate);
        EventEmitter.on('creating_channel', this.onLoading);
    }

    componentWillUnmount() {
        EventEmitter.off('can_create_channel', this.onCanCreate);
        EventEmitter.off('creating_channel', this.onLoading);
    }

    onCanCreate = (enabled) => {
        this.setState({enabled});
    };

    onLoading = (loading) => {
        this.setState({loading});
    };

    onPress = () => {
        if (this.state.enabled) {
            this.props.emitter('create_channel');
        }
    };

    render() {
        const {theme} = this.props;
        const {enabled, loading} = this.state;
        let color = changeOpacity(theme.sidebarHeaderTextColor, 0.4);
        if (enabled) {
            color = theme.sidebarHeaderTextColor;
        }

        if (loading) {
            return (
                <Loading
                    color={color}
                    size='small'
                    style={{
                        alignItems: 'center',
                        flex: 1,
                        flexDirection: 'column',
                        justifyContent: 'center',
                        paddingHorizontal: 20}}
                />
            );
        }

        return (
            <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1}}>
                <TouchableOpacity
                    onPress={this.onPress}
                    style={{paddingHorizontal: 15}}
                >
                    <FormattedText
                        id='mobile.create_channel'
                        defaultMessage='Create'
                        style={{color}}
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

export default connect(mapStateToProps)(CreateChannelButton);
