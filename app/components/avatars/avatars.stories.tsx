// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import {storiesOf} from '@storybook/react-native';
import {withKnobs, array, number, select} from '@storybook/addon-knobs';
import {Preferences} from '@mm-redux/constants';

import Avatars from './avatars';

storiesOf('Avatars', module).
    addDecorator(withKnobs).
    add('Avatars', () => (
        <Avatars
            size={number('size', 24, {range: true, min: 16, max: 80, step: 8})}
            userIds={array('userIds', ['cb5wff5ah3y8ifijsgwrdhnn9o', 'psd3g9p9sjykuxqijh9qzmh86w', 'ue6q4zzgntykikm6f6fy5tju8r', 'iq164nrrmjff5mtbafr4jpukcy'], ',')}
            theme={select('theme', Preferences.THEMES, Preferences.THEMES.default)}
        />
    ));
