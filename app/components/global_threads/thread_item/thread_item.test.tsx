// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import * as redux from 'react-redux';
import {Text} from 'react-native';
import merge from 'deepmerge';
import {shallow} from 'enzyme';

import * as navigationActions from '@actions/navigation';
import initialState from '@store/initial_state';
import {intl} from 'test/intl-test-helper';

import ThreadItem from './thread_item';

describe('Global Thread Item', () => {
    const testID = 'thread_item';

    const baseProps = {
        intl,
        postId: 'post1',
        testID,
    };

    const testIDPrefix = `${testID}.post1`;

    const baseState = merge(
        initialState,
        {
            entities: {
                posts: {
                    posts: {
                        post1: {
                            id: 'post1',
                        },
                    },
                },
                teams: {
                    currentTeamId: 'team1',
                },
                threads: {
                    threads: {
                        post1: {
                            id: 'post1',
                            unread_replies: 5,
                        },
                    },
                },
            },
        },
    );

    jest.spyOn(redux, 'useSelector').mockImplementation((callback) => callback(baseState));

    test('Should render thread item with unread messages dot', () => {
        const wrapper = shallow(
            <ThreadItem
                {...baseProps}
            />,
        );
        expect(wrapper.getElement()).toMatchSnapshot();

        expect(wrapper.find({testID: `${testIDPrefix}.unread_dot`}).exists()).toBeTruthy();
        expect(wrapper.find({testID: `${testIDPrefix}.unread_mentions`}).exists()).toBeFalsy();
    });

    test('Should show unread mentions count', () => {
        jest.spyOn(redux, 'useSelector').mockImplementation((callback) => callback(
            merge(
                baseState,
                {
                    entities: {
                        threads: {
                            threads: {
                                post1: {
                                    unread_mentions: 5,
                                },
                            },
                        },
                    },
                },
            ),
        ));
        const wrapper = shallow(
            <ThreadItem
                {...baseProps}
            />,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find({testID: `${testIDPrefix}.unread_dot`}).exists()).toBeFalsy();

        const mentionBadge = wrapper.find({testID: `${testIDPrefix}.unread_mentions`}).at(0);
        expect(mentionBadge.exists()).toBeTruthy();
        expect(mentionBadge.find(Text).children().text().trim()).toBe('5');
    });

    test('Should show unread mentions as 99+ when over 99', () => {
        jest.spyOn(redux, 'useSelector').mockImplementation((callback) => callback(
            merge(
                baseState,
                {
                    entities: {
                        threads: {
                            threads: {
                                post1: {
                                    unread_mentions: 511,
                                },
                            },
                        },
                    },
                },
            ),
        ));
        const wrapper = shallow(
            <ThreadItem
                {...baseProps}
            />,
        );
        const mentionBadge = wrapper.find({testID: `${testIDPrefix}.unread_mentions`}).at(0);
        expect(mentionBadge.find(Text).children().text().trim()).toBe('99+');
    });

    test('Should goto threads when pressed on thread item', () => {
        const goToScreen = jest.spyOn(navigationActions, 'goToScreen');
        const wrapper = shallow(
            <ThreadItem
                {...baseProps}
            />,
        );
        const threadItem = wrapper.find({testID: `${testIDPrefix}.item`});
        expect(threadItem.exists()).toBeTruthy();
        threadItem.simulate('press');
        expect(goToScreen).toHaveBeenCalledWith('Thread', expect.anything(), expect.anything());
    });
});
