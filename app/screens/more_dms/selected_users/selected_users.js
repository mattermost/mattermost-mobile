// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {View} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import SelectedUser from 'app/screens/more_dms/selected_users/selected_user';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class SelectedUsers extends React.PureComponent {
    static propTypes = {

        /*
         * The current theme.
         */
        theme: PropTypes.object.isRequired,

        /*
         * An object mapping user ids to a falsey value indicating whether or not they've been selected.
         */
        selectedIds: PropTypes.object.isRequired,

        /*
         * An object mapping user ids to users.
         */
        profiles: PropTypes.object.isRequired,

        /*
         * How to display the names of users.
         */
        teammateNameDisplay: PropTypes.string.isRequired,

        /*
         * The number of users that will be selected when we start to display a message indicating
         * the remaining number of users that can be selected.
         */
        warnCount: PropTypes.number.isRequired,

        /*
         * An i18n string displaying how many more users can be selected.
         */
        warnMessage: PropTypes.object.isRequired,

        /*
         * The maximum number of users that can be selected.
         */
        maxCount: PropTypes.number.isRequired,

        /*
         * An i18n string displayed when no more users can be selected.
         */
        maxMessage: PropTypes.object.isRequired,

        /*
         * A handler function that will deselect a user when clicked on.
         */
        onRemove: PropTypes.func.isRequired,
    };

    render() {
        const users = [];
        for (const id of Object.keys(this.props.selectedIds)) {
            if (!this.props.selectedIds[id]) {
                continue;
            }

            users.push(
                <SelectedUser
                    key={id}
                    user={this.props.profiles[id]}
                    theme={this.props.theme}
                    teammateNameDisplay={this.props.teammateNameDisplay}
                    onRemove={this.props.onRemove}
                />
            );
        }

        if (users.length === 0) {
            return null;
        }

        const style = getStyleFromTheme(this.props.theme);

        let message = null;
        if (users.length >= this.props.maxCount) {
            message = (
                <FormattedText
                    style={style.message}
                    {...this.props.maxMessage}
                />
            );
        } else if (users.length >= this.props.warnCount) {
            message = (
                <FormattedText
                    style={style.message}
                    {...this.props.warnMessage}
                    values={{
                        remaining: this.props.maxCount - users.length,
                    }}
                />
            );
        }

        return (
            <View style={style.container}>
                <View style={style.users}>
                    {users}
                </View>
                {message}
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginLeft: 5,
            marginBottom: 5,
        },
        users: {
            alignItems: 'flex-start',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        message: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 12,
            marginRight: 5,
            marginTop: 10,
            marginBottom: 2,
        },
    };
});
