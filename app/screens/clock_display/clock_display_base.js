// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';

import Preferences from 'mattermost-redux/constants/preferences';

export default class ClockDisplayBase extends PureComponent {
    static propTypes = {
        theme: PropTypes.object.isRequired,
        militaryTime: PropTypes.string.isRequired,
        userId: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            savePreferences: PropTypes.func.isRequired,
        }).isRequired,
    };
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            newMilitaryTime: props.militaryTime,
        };
    }

    setMilitaryTime = (value) => {
        this.setState({
            newMilitaryTime: value,
        });

        this.saveClockDisplayPreference(value);
    };

    saveClockDisplayPreference = (newMilitaryTime) => {
        const {userId, actions: {savePreferences}} = this.props;

        const timePreference = {
            user_id: userId,
            category: Preferences.CATEGORY_DISPLAY_SETTINGS,
            name: 'use_military_time',
            value: newMilitaryTime,
        };

        savePreferences(userId, [timePreference]);
    }
}
