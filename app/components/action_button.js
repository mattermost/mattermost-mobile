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

class ActionButton extends PureComponent {
    static propTypes = {
        actionEventName: PropTypes.string.isRequired,
        emitter: PropTypes.func.isRequired,
        enabled: PropTypes.bool,
        enableEventName: PropTypes.string,
        labelDefaultMessage: PropTypes.string.isRequired,
        labelId: PropTypes.string.isRequired,
        loadingEventName: PropTypes.string.isRequired,
        theme: PropTypes.object
    };

    static defaultProps = {
        theme: {},
        enabled: true
    };

    constructor(props) {
        super(props);

        this.state = {
            enabled: props.enabled,
            loading: false
        };
    }

    componentWillMount() {
        EventEmitter.on(this.props.enableEventName, this.handleEnableEvent);
        EventEmitter.on(this.props.loadingEventName, this.handleLoadingEvent);
    }

    componentWillUnmount() {
        EventEmitter.off(this.props.enableEventName, this.handleEnableEvent);
        EventEmitter.off(this.props.loadingEventName, this.handleLoadingEvent);
    }

    handleEnableEvent = (enabled) => {
        this.setState({enabled});
    };

    handleLoadingEvent = (loading) => {
        this.setState({loading});
    };

    onPress = () => {
        if (this.state.enabled) {
            this.props.emitter(this.props.actionEventName);
        }
    };

    render() {
        const {labelDefaultMessage, labelId, theme} = this.props;
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
                        id={labelId}
                        defaultMessage={labelDefaultMessage}
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

export default connect(mapStateToProps)(ActionButton);
