// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Text, View} from 'react-native';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
import {ViewTypes} from 'app/constants';

export default class ActionMenu extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            doPostAction: PropTypes.func.isRequired,
            setMenuActionSelector: PropTypes.func.isRequired,
        }).isRequired,
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        dataSource: PropTypes.string,
        options: PropTypes.arrayOf(PropTypes.object),
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        navigator: PropTypes.object,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props) {
        super(props);

        this.state = {
            selectedText: null,
        };
    }

    handleSelect = (selected) => {
        if (!selected) {
            return;
        }

        const {dataSource, actions, postId, id} = this.props;

        let selectedText;
        let selectedValue;
        if (dataSource === ViewTypes.DATA_SOURCE_USERS) {
            selectedText = selected.username;
            selectedValue = selected.id;
        } else if (dataSource === ViewTypes.DATA_SOURCE_CHANNELS) {
            selectedText = selected.display_name;
            selectedValue = selected.id;
        } else {
            selectedText = selected.text;
            selectedValue = selected.value;
        }

        this.setState({selectedText});

        actions.doPostAction(postId, id, selectedValue);
    }

    goToMenuActionSelector = preventDoubleTap(() => {
        const {intl} = this.context;
        const {navigator, theme, actions, dataSource, options, name} = this.props;

        actions.setMenuActionSelector(dataSource, this.handleSelect, options);

        navigator.push({
            backButtonTitle: '',
            screen: 'MenuActionSelector',
            title: name || intl.formatMessage({id: 'action_menu.select', defaultMessage: 'Select an option'}),
            animated: true,
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    render() {
        const {intl} = this.context;
        const {name, theme, id} = this.props;
        const {selectedText} = this.state;
        const style = getStyleSheet(theme);

        let text = name || intl.formatMessage({id: 'action_menu.select', defaultMessage: 'Select an option'});
        let selectedStyle = style.dropdownPlaceholder;
        let submitted;
        if (selectedText) {
            text = selectedText;
            selectedStyle = style.dropdownSelected;
            submitted = (
                <React.Fragment>
                    <Icon
                        key={id + 'check'}
                        name='check'
                        color={theme.centerChannelColor}
                        style={style.submittedIcon}
                    />
                    <FormattedText
                        key={id + 'submitted'}
                        id='action_menu.submitted'
                        defaultMessage='Submitted'
                        style={style.submittedText}
                    />
                </React.Fragment>
            );
        }

        return (
            <View>
                <Text
                    style={[style.dropdown, selectedStyle]}
                    onPress={this.goToMenuActionSelector}
                    numberOfLines={1}
                >
                    {text}
                </Text>
                <Icon
                    name='chevron-down'
                    onPress={this.goToMenuActionSelector}
                    color={changeOpacity(theme.centerChannelColor, 0.5)}
                    style={style.icon}
                />
                {submitted}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            width: '100%',
        },
        dropdown: {
            position: 'relative',
            borderWidth: 1,
            borderRadius: 5,
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: changeOpacity(theme.centerChannelBg, 0.9),
            alignItems: 'center',
            marginBottom: 2,
            marginRight: 5,
            marginTop: 10,
            paddingLeft: 10,
            paddingRight: 20,
            paddingVertical: 7,
            width: 150,
        },
        dropdownPlaceholder: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        dropdownSelected: {
            color: theme.centerChannelColor,
        },
        icon: {
            position: 'absolute',
            right: 15,
            top: 21,
        },
        submittedIcon: {
            position: 'absolute',
            left: 160,
            top: 21,
        },
        submittedText: {
            position: 'absolute',
            left: 175,
            top: 17,
        },
    };
});
