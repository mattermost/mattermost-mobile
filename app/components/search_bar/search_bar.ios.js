// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import SearchBar from 'react-native-search-bar';

export default class SearchBarIos extends PureComponent {
    static propTypes = {
        barStyle: PropTypes.oneOf(['default', 'black']),
        searchBarStyle: PropTypes.oneOf(['default', 'prominent', 'minimal']),
        text: PropTypes.string,
        placeholder: PropTypes.string,
        showCancelButton: PropTypes.bool,
        hideBackground: PropTypes.bool,
        textFieldBackgroundColor: PropTypes.string,
        placeholderTextColor: PropTypes.string,
        textColor: PropTypes.string,
        barTintColor: PropTypes.string, //color of the background container
        tintColor: PropTypes.string, // color of the carret and the cancel button
        onChange: PropTypes.func,
        onChangeText: PropTypes.func,
        onFocus: PropTypes.func,
        onBlur: PropTypes.func,
        onSearchButtonPress: PropTypes.func,
        onCancelButtonPress: PropTypes.func
    };

    static defaultProps = {
        barStyle: 'default',
        searchBarStyle: 'minimal',
        placeholder: 'Search',
        showCancelButton: true,
        hideBackground: true,
        onFocus: () => true,
        onBlur: () => true
    };

    constructor(props) {
        super(props);

        this.state = {
            displayCancelButton: false
        };
    }

    onFocus = (event) => {
        const onFocus = this.props.onFocus;
        if (this.props.showCancelButton) {
            this.setState({displayCancelButton: true});
        }

        onFocus(event);
    };

    onBlur = (event) => {
        const onBlur = this.props.onBlur;
        if (this.props.showCancelButton) {
            this.setState({displayCancelButton: false});
        }

        onBlur(event);
    };

    blur = () => {
        this.searchBar.blur();
    };

    searchBarRef = (ref) => {
        this.searchBar = ref;
    };

    render() {
        return (
            <SearchBar
                ref={this.searchBarRef}
                barStyle={this.props.barStyle}
                searchBarStyle={this.props.searchBarStyle}
                text={this.props.text}
                placeholder={this.props.placeholder}
                showsCancelButton={this.state.displayCancelButton}
                hideBackground={false}
                textFieldBackgroundColor={this.props.textFieldBackgroundColor}
                placeholderTextColor={this.props.placeholderTextColor}
                textColor={this.props.textColor}
                barTintColor={this.props.barTintColor}
                tintColor={this.props.tintColor}
                onChange={this.props.onChange}
                onChangeText={this.props.onChangeText}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                onSearchButtonPress={this.props.onSearchButtonPress}
                onCancelButtonPress={this.props.onCancelButtonPress}
            />
        );
    }
}
