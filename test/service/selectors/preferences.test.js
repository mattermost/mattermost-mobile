// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import Config from 'config';

import {Preferences, Themes} from 'service/constants';
import {getTheme} from 'service/selectors/entities/preferences';

describe('Selectors.Preferences', () => {
    it.only('getTheme', () => {
        it('should return default theme', () => {
            assert.deepEqual(
                getTheme({
                    entities: {
                        teams: {
                            currentId: ''
                        },
                        preferences: {
                            myPreferences: {}
                        }
                    }
                }),
                typeof Config.DefaultTheme === 'string' ? Themes[Config.DefaultTheme] : Config.DefaultTheme
            );
        });

        it('should return global theme by name', () => {
            assert.deepEqual(
                getTheme({
                    entities: {
                        teams: {
                            currentId: ''
                        },
                        preferences: {
                            myPreferences: {
                                [`${Preferences.CATEGORY_THEME}--`]: {value: 'mattermost'}
                            }
                        }
                    }
                }),
                Themes.mattermost
            );
        });

        it('should return global custom theme', () => {
            assert.deepEqual(
                getTheme({
                    entities: {
                        teams: {
                            currentId: ''
                        },
                        preferences: {
                            myPreferences: {
                                [`${Preferences.CATEGORY_THEME}--`]: {value: '{"sidebarBg": "#ff0000"}'}
                            }
                        }
                    }
                }),
                {sidebarBg: '#ff0000'}
            );
        });

        it('should return global theme by name when on team', () => {
            assert.deepEqual(
                getTheme({
                    entities: {
                        teams: {
                            currentId: '1234'
                        },
                        preferences: {
                            myPreferences: {
                                [`${Preferences.CATEGORY_THEME}--`]: {value: 'mattermost'}
                            }
                        }
                    }
                }),
                Themes.mattermost
            );
        });

        it('should return global custom theme when on team', () => {
            assert.deepEqual(
                getTheme({
                    entities: {
                        teams: {
                            currentId: '1234'
                        },
                        preferences: {
                            myPreferences: {
                                [`${Preferences.CATEGORY_THEME}--`]: {value: '{"sidebarBg": "#ff0000"}'}
                            }
                        }
                    }
                }),
                {sidebarBg: '#ff0000'}
            );
        });

        it('should return team-specific theme by name when on team', () => {
            assert.deepEqual(
                getTheme({
                    entities: {
                        teams: {
                            currentId: '1234'
                        },
                        preferences: {
                            myPreferences: {
                                [`${Preferences.CATEGORY_THEME}--`]: {value: 'mattermost'},
                                [`${Preferences.CATEGORY_THEME}--1234`]: {value: 'mattermostDark'}
                            }
                        }
                    }
                }),
                Themes.mattermostDark
            );
        });

        it('should return team-specific custom theme when on team', () => {
            assert.deepEqual(
                getTheme({
                    entities: {
                        teams: {
                            currentId: '1234'
                        },
                        preferences: {
                            myPreferences: {
                                [`${Preferences.CATEGORY_THEME}--`]: {value: '{"sidebarBg": "#ff0000"}'},
                                [`${Preferences.CATEGORY_THEME}--1234`]: {value: '{"sidebarBg": "#00ff00"}'}
                            }
                        }
                    }
                }),
                {sidebarBg: '#00ff00'}
            );
        });
    });
});
