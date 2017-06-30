// Copyright (c) 2017 Crabstudio.
// Modified work: Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Animated,
    Dimensions,
    InteractionManager,
    Keyboard,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    StyleSheet,
    View
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const AnimatedIcon = Animated.createAnimatedComponent(IonIcon);
const containerHeight = 40;
const middleHeight = 20;

export default class Search extends Component {
    static propTypes = {
        onBlur: PropTypes.func,
        onFocus: PropTypes.func,
        onSearch: PropTypes.func,
        onChangeText: PropTypes.func,
        onCancel: PropTypes.func,
        onDelete: PropTypes.func,
        onSelectionChange: PropTypes.func,
        backgroundColor: PropTypes.string,
        placeholderTextColor: PropTypes.string,
        titleCancelColor: PropTypes.string,
        tintColorSearch: PropTypes.string,
        tintColorDelete: PropTypes.string,
        inputStyle: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.object,
            View.propTypes.style
        ]),
        onLayout: PropTypes.func,
        cancelButtonStyle: View.propTypes.style,
        autoFocus: PropTypes.bool,
        placeholder: PropTypes.string,
        cancelTitle: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.object
        ]),
        iconDelete: PropTypes.object,
        iconSearch: PropTypes.object,
        returnKeyType: PropTypes.string,
        keyboardType: PropTypes.string,
        autoCapitalize: PropTypes.string,
        inputHeight: PropTypes.number,
        inputBorderRadius: PropTypes.number,
        contentWidth: PropTypes.number,
        middleWidth: PropTypes.number,
        editable: PropTypes.bool,
        blurOnSubmit: PropTypes.bool,
        keyboardShouldPersist: PropTypes.bool,
        value: PropTypes.string,
        positionRightDelete: PropTypes.number,
        searchIconCollapsedMargin: PropTypes.number,
        searchIconExpandedMargin: PropTypes.number,
        placeholderCollapsedMargin: PropTypes.number,
        placeholderExpandedMargin: PropTypes.number,
        shadowOffsetHeightCollapsed: PropTypes.number,
        shadowOffsetHeightExpanded: PropTypes.number,
        shadowOffsetWidth: PropTypes.number,
        shadowColor: PropTypes.string,
        shadowOpacityCollapsed: PropTypes.number,
        shadowOpacityExpanded: PropTypes.number,
        shadowRadius: PropTypes.number,
        shadowVisible: PropTypes.bool
    };

    static defaultProps = {
        onSelectionChange: () => true,
        onBlur: () => true,
        editable: true,
        blurOnSubmit: false,
        keyboardShouldPersist: false,
        placeholderTextColor: 'grey',
        searchIconCollapsedMargin: 25,
        searchIconExpandedMargin: 10,
        placeholderCollapsedMargin: 15,
        placeholderExpandedMargin: 20,
        shadowOffsetWidth: 0,
        shadowOffsetHeightCollapsed: 2,
        shadowOffsetHeightExpanded: 4,
        shadowColor: '#000',
        shadowOpacityCollapsed: 0.12,
        shadowOpacityExpanded: 0.24,
        shadowRadius: 4,
        shadowVisible: false,
        value: ''
    };

    constructor(props) {
        super(props);

        this.state = {
            keyword: props.value || '',
            expanded: false
        };
        const {width} = Dimensions.get('window');
        this.contentWidth = width;
        this.middleWidth = width / 2;

        this.iconSearchAnimated = new Animated.Value(this.props.searchIconCollapsedMargin);
        this.iconDeleteAnimated = new Animated.Value(0);
        this.inputFocusWidthAnimated = new Animated.Value(this.contentWidth - 10);
        this.inputFocusPlaceholderAnimated = new Animated.Value(this.props.placeholderCollapsedMargin);
        this.btnCancelAnimated = new Animated.Value(this.contentWidth);
        this.shadowOpacityAnimated = new Animated.Value(this.props.shadowOpacityCollapsed);

        this.placeholder = this.props.placeholder || 'Search';
        this.cancelTitle = this.props.cancelTitle || 'Cancel';
        this.shadowHeight = this.props.shadowOffsetHeightCollapsed;
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.value !== nextProps.value) {
            if (nextProps.value) {
                this.iconDeleteAnimated = new Animated.Value(1);
            }
        }
    }

    blur = () => {
        this.refs.input_keyword.getNode().blur();
    };

    focus = () => {
        this.refs.input_keyword.getNode().focus();
    };

    onBlur = () => {
        this.props.onBlur();
    };

    onLayout = (event) => {
        const contentWidth = event.nativeEvent.layout.width;
        this.contentWidth = contentWidth;
        this.middleWidth = contentWidth / 2;
        if (this.state.expanded) {
            this.expandAnimation();
        } else {
            this.collapseAnimation();
        }
    };

    onSearch = async () => {
        if (this.props.keyboardShouldPersist === false) {
            await Keyboard.dismiss();
        }

        if (this.props.onSearch) {
            this.props.onSearch(this.props.value);
        }
    };

    onChangeText = (text) => {
        Animated.timing(
            this.iconDeleteAnimated,
            {
                toValue: (text.length > 0) ? 1 : 0,
                duration: 200
            }
        ).start();

        if (this.props.onChangeText) {
            this.props.onChangeText(text);
        }
    };

    onFocus = () => {
        InteractionManager.runAfterInteractions(async () => {
            const input = this.refs.input_keyword.getNode();
            if (!input.isFocused()) {
                input.focus();
            }

            this.setState({expanded: true});
            await this.expandAnimation();

            if (this.props.onFocus) {
                this.props.onFocus(this.props.value);
            }
        });
    };

    onDelete = () => {
        Animated.timing(
            this.iconDeleteAnimated,
            {
                toValue: 0,
                duration: 200
            }
        ).start();
        this.setState({keyword: ''});

        if (this.props.onDelete) {
            this.props.onDelete();
        }
    };

    onCancel = async () => {
        this.setState({keyword: '', expanded: false});
        await this.collapseAnimation(true);

        if (this.props.onCancel) {
            this.props.onCancel();
        }
    };

    onSelectionChange = (event) => {
        this.props.onSelectionChange(event);
    };

    expandAnimation = () => {
        return new Promise((resolve) => {
            Animated.parallel([
                Animated.timing(
                    this.inputFocusWidthAnimated,
                    {
                        toValue: this.contentWidth - 70,
                        duration: 200
                    }
                ).start(),
                Animated.timing(
                    this.btnCancelAnimated,
                    {
                        toValue: 10,
                        duration: 200
                    }
                ).start(),
                Animated.timing(
                    this.inputFocusPlaceholderAnimated,
                    {
                        toValue: this.props.placeholderExpandedMargin,
                        duration: 200
                    }
                ).start(),
                Animated.timing(
                    this.iconSearchAnimated,
                    {
                        toValue: this.props.searchIconExpandedMargin,
                        duration: 200
                    }
                ).start(),
                Animated.timing(
                    this.iconDeleteAnimated,
                    {
                        toValue: (this.props.value.length > 0) ? 1 : 0,
                        duration: 200
                    }
                ).start(),
                Animated.timing(
                    this.shadowOpacityAnimated,
                    {
                        toValue: this.props.shadowOpacityExpanded,
                        duration: 200
                    }
                ).start()
            ]);
            this.shadowHeight = this.props.shadowOffsetHeightExpanded;
            resolve();
        });
    };

    collapseAnimation = (isForceAnim = false) => {
        return new Promise((resolve) => {
            Animated.parallel([
                ((this.props.keyboardShouldPersist === false) ? Keyboard.dismiss() : null),
                Animated.timing(
                    this.inputFocusWidthAnimated,
                    {
                        toValue: this.contentWidth - 10,
                        duration: 200
                    }
                ).start(),
                Animated.timing(
                    this.btnCancelAnimated,
                    {
                        toValue: this.contentWidth,
                        duration: 200
                    }
                ).start(),
                ((this.props.keyboardShouldPersist === false) ?
                    Animated.timing(
                        this.inputFocusPlaceholderAnimated,
                        {
                            toValue: this.props.placeholderCollapsedMargin,
                            duration: 200
                        }
                    ).start() : null),
                ((this.props.keyboardShouldPersist === false || isForceAnim === true) ?
                    Animated.timing(
                        this.iconSearchAnimated,
                        {
                            toValue: this.props.searchIconCollapsedMargin,
                            duration: 200
                        }
                    ).start() : null),
                Animated.timing(
                    this.iconDeleteAnimated,
                    {
                        toValue: 0,
                        duration: 200
                    }
                ).start(),
                Animated.timing(
                    this.shadowOpacityAnimated,
                    {
                        toValue: this.props.shadowOpacityCollapsed,
                        duration: 200
                    }
                ).start()
            ]);
            this.shadowHeight = this.props.shadowOffsetHeightCollapsed;
            resolve();
        });
    };

    render() {
        let iconSize = 16;
        if (this.props.inputStyle && this.props.inputStyle.fontSize) {
            iconSize = this.props.inputStyle.fontSize + 2;
        }

        return (
            <Animated.View
                ref='searchContainer'
                style={[
                    styles.container,
                    this.props.backgroundColor && {backgroundColor: this.props.backgroundColor}
                ]}
                onLayout={this.onLayout}
            >
                <AnimatedTextInput
                    ref='input_keyword'
                    style={[
                        styles.input,
                        this.props.placeholderTextColor && {color: this.props.placeholderTextColor},
                        this.props.inputStyle && this.props.inputStyle,
                        this.props.inputHeight && {height: this.props.inputHeight},
                        this.props.inputBorderRadius && {borderRadius: this.props.inputBorderRadius},
                        {
                            width: this.inputFocusWidthAnimated,
                            paddingLeft: this.inputFocusPlaceholderAnimated
                        },
                        this.props.shadowVisible && {
                            shadowOffset: {width: this.props.shadowOffsetWidth, height: this.shadowHeight},
                            shadowColor: this.props.shadowColor,
                            shadowOpacity: this.shadowOpacityAnimated,
                            shadowRadius: this.props.shadowRadius
                        }

                    ]}
                    autoFocus={this.props.autoFocus}
                    editable={this.props.editable}
                    value={this.props.value}
                    onChangeText={this.onChangeText}
                    placeholder={this.placeholder}
                    placeholderTextColor={this.props.placeholderTextColor}
                    onSubmitEditing={this.onSearch}
                    onSelectionChange={this.onSelectionChange}
                    autoCorrect={false}
                    blurOnSubmit={this.props.blurOnSubmit}
                    returnKeyType={this.props.returnKeyType || 'search'}
                    keyboardType={this.props.keyboardType || 'default'}
                    autoCapitalize={this.props.autoCapitalize}
                    onBlur={this.onBlur}
                    onFocus={this.onFocus}
                    underlineColorAndroid='transparent'
                    enablesReturnKeyAutomatically={true}
                />
                <TouchableWithoutFeedback onPress={this.onFocus}>
                    {((this.props.iconSearch) ?
                        <Animated.View
                            style={[
                                styles.iconSearch,
                                {left: this.iconSearchAnimated}
                            ]}
                        >
                            {this.props.iconSearch}
                        </Animated.View> :
                        <AnimatedIcon
                            name='ios-search-outline'
                            size={iconSize}
                            style={[
                                styles.iconSearch,
                                styles.iconSearchDefault,
                                this.props.tintColorSearch && {color: this.props.tintColorSearch},
                                {
                                    left: this.iconSearchAnimated,
                                    top: middleHeight - (iconSize / 2)
                                }
                            ]}
                        />
                    )}
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback onPress={this.onDelete}>
                    {((this.props.iconDelete) ?
                        <Animated.View
                            style={[
                                styles.iconDelete,
                                this.props.positionRightDelete && {right: this.props.positionRightDelete},
                                {opacity: this.iconDeleteAnimated}
                            ]}
                        >
                            {this.props.iconDelete}
                        </Animated.View> :
                        <AnimatedIcon
                            name='ios-close-circle'
                            size={iconSize}
                            style={[
                                styles.iconDelete,
                                styles.iconDeleteDefault,
                                this.props.tintColorDelete && {color: this.props.tintColorDelete},
                                this.props.positionRightDelete && {right: this.props.positionRightDelete},
                                {
                                    opacity: this.iconDeleteAnimated,
                                    top: middleHeight - (iconSize / 2)
                                }
                            ]}
                        />
                    )}
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback onPress={this.onCancel}>
                    <Animated.View
                        style={[
                            styles.cancelButton,
                            this.props.cancelButtonStyle && this.props.cancelButtonStyle,
                            {left: this.btnCancelAnimated}
                        ]}
                    >
                        <Text
                            style={[
                                styles.cancelButtonText,
                                this.props.titleCancelColor && {color: this.props.titleCancelColor},
                                this.props.cancelButtonStyle && this.props.cancelButtonStyle
                            ]}
                        >
                            {this.cancelTitle}
                        </Text>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Animated.View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'grey',
        height: containerHeight,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 5
    },
    input: {
        height: containerHeight - 10,
        paddingTop: 5,
        paddingBottom: 5,
        paddingRight: 20,
        borderColor: '#444',
        backgroundColor: '#f7f7f7',
        borderRadius: 5,
        fontSize: 13
    },
    iconSearch: {
        flex: 1,
        position: 'absolute'
    },
    iconSearchDefault: {
        color: 'grey'
    },
    iconDelete: {
        position: 'absolute',
        right: 70
    },
    iconDeleteDefault: {
        color: 'grey'
    },
    cancelButton: {
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
        width: 60,
        height: 50
    },
    cancelButtonText: {
        fontSize: 14,
        color: '#fff'
    }
});

