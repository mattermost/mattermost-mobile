// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';

import {
    View,
    StyleSheet,
    Dimensions,
    Modal,
    Text,
    ScrollView,
    TouchableOpacity,
    TouchableWithoutFeedback
} from 'react-native';

import FormattedText from 'app/components/formatted_text';

const {width} = Dimensions.get('window');
const styles = StyleSheet.create({
    overlayStyle: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        paddingBottom: 10,
        paddingLeft: 5,
        backgroundColor: 'rgba(0,0,0,0.3)'
    },

    optionContainer: {
        borderRadius: 10,
        width: (width - 10),
        minHeight: 50,
        backgroundColor: '#fff',
        marginBottom: 5
    },

    cancelStyle: {
        borderRadius: 10,
        width: (width - 10),
        height: 50,
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: 8
    },

    cancelTextStyle: {
        textAlign: 'center',
        color: '#4E8ACC',
        fontWeight: 'bold',
        fontSize: 17
    },

    optionStyle: {
        padding: 8,
        height: 50,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#999999'
    },

    optionTextStyle: {
        textAlign: 'center',
        fontSize: 17,
        color: '#4E8ACC'
    },

    titleStyle: {
        paddingTop: 8,
        paddingHorizontal: 10,
        height: 70,
        borderBottomWidth: 1,
        borderBottomColor: '#999999'
    },

    titleTextStyle: {
        fontSize: 15,
        color: '#7f8180'
    }
});

export default class ModalOptions extends Component {
    static propTypes = {
        title: PropTypes.string,
        options: PropTypes.array,
        visible: PropTypes.bool,
        onChange: PropTypes.func,
        style: View.propTypes.style,
        titleStyle: View.propTypes.style,
        titleTextStyle: View.propTypes.style,
        cancelStyle: View.propTypes.style,
        cancelTextStyle: Text.propTypes.style,
        overlayStyle: View.propTypes.style,
        cancelText: PropTypes.string
    };

    static defaultProps = {
        title: '',
        options: [],
        visible: false,
        style: {},
        cancelStyle: {},
        cancelTextStyle: {},
        overlayStyle: {},
        titleStyle: {},
        titleTextStyle: {},
        cancelText: 'Cancel'
    };

    constructor(props) {
        super(props);

        this.state = {
            animationType: 'slide',
            modalVisible: false,
            transparent: false
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.visible !== this.props.visible) {
            this.setState({modalVisible: nextProps.visible});
        }
    }

    onChange = (option) => {
        this.props.onChange(option);
    };

    renderOption = (option, index) => {
        const optionStyle = [styles.optionStyle];
        const optionTextStyle = [styles.optionTextStyle];

        if (option.style) {
            optionStyle.push(option.style);
        }

        if (option.textStyle) {
            optionTextStyle.push(option.textStyle);
        }

        let text = option.text;
        if (!(text instanceof FormattedText)) {
            text = (
                <Text style={optionTextStyle}>{option.text}</Text>
            );
        }
        return (
            <TouchableOpacity
                key={index}
                onPress={() => this.onChange(option)}
            >
                <View style={optionStyle}>
                    {text}
                </View>
            </TouchableOpacity>
        );
    };

    renderOptionList = () => {
        const options = this.props.options.map((option, index) => {
            return this.renderOption(option, index);
        });

        let title;
        if (this.props.title) {
            title = (
                <View style={[styles.titleStyle, this.props.titleStyle]}>
                    <Text style={[styles.titleTextStyle, this.props.titleTextStyle]}>
                        {this.props.title}
                    </Text>
                </View>
            );
        }

        return (
            <View style={[styles.overlayStyle, this.props.overlayStyle]}>
                <View style={styles.optionContainer}>
                    <ScrollView keyboardShouldPersistTaps='never'>
                        <View style={{paddingHorizontal: 10}}>
                            {title}
                            {options}
                        </View>
                    </ScrollView>
                </View>
                <View>
                    <TouchableOpacity onPress={() => this.onChange(null)}>
                        <View style={[styles.cancelStyle, this.props.cancelStyle]}>
                            <Text style={[styles.cancelTextStyle, this.props.cancelTextStyle]}>
                                {this.props.cancelText}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    render() {
        const modalOptions = (
            <Modal
                transparent={true}
                visible={this.state.modalVisible}
                onRequestClose={() => this.onChange(null)}
                animationType={this.state.animationType}
            >
                <TouchableWithoutFeedback onPress={() => this.onChange(null)}>
                    {this.renderOptionList()}
                </TouchableWithoutFeedback>
            </Modal>
        );

        return (
            <View style={this.props.style}>
                {modalOptions}
            </View>
        );
    }
}
