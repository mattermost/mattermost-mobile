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

import {getTheme} from 'app/selectors/preferences';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

class AccountNotifcationsButton extends PureComponent {
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
            loading: false
        };
    }

    componentWillMount() {
        EventEmitter.on('saving_notify_props', this.onLoading);
    }

    componentWillUnmount() {
        EventEmitter.off('saving_notify_props', this.onLoading);
    }

    onLoading = (loading) => {
        this.setState({loading});
    };

    onPress = () => {
        this.props.emitter('save_notify_props');
    };

    render() {
        const {theme} = this.props;
        const {loading} = this.state;
        const color = theme.sidebarHeaderTextColor;

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
                        paddingHorizontal: 20
                    }}
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
                        id='add_command.save'
                        defaultMessage='Save'
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

export default connect(mapStateToProps)(AccountNotifcationsButton);
