// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import {storiesOf} from '@storybook/react-native';
import {withKnobs, select, number} from '@storybook/addon-knobs';

import AppIcon from './app_icon';

storiesOf('App Icon', module).
    addDecorator(withKnobs).
    add('Icon', () => (
        <AppIcon
            color={select('color', {Red: 'red', Blue: 'blue', Yellow: 'yellow'}, 'red')}
            height={number('height', 100)}
            width={number('width', 100)}
        />
    ));