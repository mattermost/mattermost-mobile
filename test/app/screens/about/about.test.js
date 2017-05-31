// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import assert from 'assert';

import About from 'app/screens/about/about';
import Themes from 'assets/themes.json';

describe('AboutScreen', () => {
    const props = {
        config: {},
        license: {},
        theme: Themes.default
    };

    it('renders', () => {
        const wrapper = shallow(<About {...props}/>);

        assert.equal(wrapper.length, 1);
    });

    it('renders enterprise', () => {
        const otherProps = {
            ...props,
            config: {
                BuildEnterpriseReady: 'true'
            },
            license: {
                IsLicensed: 'true'
            }
        };

        const wrapper = shallow(<About {...otherProps}/>);

        assert.equal(wrapper.length, 1);
    });

    it('renders if config.BuildNumber !== config.Version', () => {
        const otherProps = {
            ...props,
            config: {
                BuildNumber: 1,
                Version: 2
            }
        };

        const wrapper = shallow(<About {...otherProps}/>);

        assert.equal(wrapper.length, 1);
    });

    it('opens about team url', () => {
        const wrapper = shallow(<About {...props}/>);

        const aboutLink = wrapper.find('TouchableOpacity');
        aboutLink.simulate('press');
    });

    it('opens learn more url', () => {
        const otherProps = {
            ...props,
            config: {
                BuildEnterpriseReady: 'true'
            }
        };

        const wrapper = shallow(<About {...otherProps}/>);

        const learnMore = wrapper.find('TouchableOpacity');
        learnMore.simulate('press');
    });
});
