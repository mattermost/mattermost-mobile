// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Dimensions,
    StyleSheet,
    View,
    TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import FormattedText from 'app/components/formatted_text';
import GeneralError from './general_error';
import Config from 'assets/config.json';

const {width: deviceWidth} = Dimensions.get('window');

const style = StyleSheet.create({
    closeButton: {
        height: 20,
        width: 20,
        borderRadius: 10,
        marginBottom: 5,
        borderColor: '#fff',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    closeButtonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5
    },
    closeButtonText: {
        color: '#fff'
    },
    container: {
        paddingTop: 15,
        paddingBottom: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 75
    },
    wrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: deviceWidth,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 116, 92, 1)',
        zIndex: 99999
    }
});

export default class ErrorList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            dismissError: PropTypes.func.isRequired,
            clearErrors: PropTypes.func.isRequired
        }).isRequired,
        errors: PropTypes.array.isRequired
    }

    renderErrorsList() {
        const {errors} = this.props;
        if (Config.ShowErrorsList) {
            return errors.map((error, index) => (
                <GeneralError
                    key={index}
                    dismiss={() => this.props.actions.dismissError(index)}
                    message={error.message}
                />
            ));
        }
        const error = errors[0];
        if (error) {
            return (
                <GeneralError
                    dismiss={() => this.props.actions.dismissError(0)}
                    message={error.message}
                />
            );
        }
        return null;
    }

    render() {
        return (
            <View style={[style.wrapper, (!this.props.errors.length && {height: 0})]}>
                <View style={style.container}>
                    {this.renderErrorsList()}
                    {this.props.errors.length > 1 &&
                        <TouchableOpacity
                            style={style.closeButtonContainer}
                            onPress={() => this.props.actions.clearErrors()}
                        >
                            <View style={style.closeButton}>
                                <Icon
                                    name='close'
                                    size={10}
                                    color='#fff'
                                />
                            </View>
                            <FormattedText
                                id='mobile.components.error_list.dismiss_all'
                                defaultMessage='Dismiss All'
                                style={style.closeButtonText}
                            />
                        </TouchableOpacity>
                    }
                </View>
            </View>
        );
    }
}
