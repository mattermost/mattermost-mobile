// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from 'test/test_helper';

import * as ViewSelectors from './views';

describe('Selectors.Views', () => {
    describe('getLastViewedChannelForTeam', () => {
        const {getLastViewedChannelForTeam} = ViewSelectors;

        const team_A = TestHelper.fakeTeam();
        const channel_A1 = TestHelper.fakeChannelWithTeamId(team_A.id);
        const channel_A2 = TestHelper.fakeChannelWithTeamId(team_A.id);

        const team_B = TestHelper.fakeTeam();
        const channel_B1 = TestHelper.fakeChannelWithTeamId(team_B.id);
        const channel_B2 = TestHelper.fakeChannelWithTeamId(team_B.id);

        it('should return last viewed channel for team', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_A.id]: [channel_A1.id, channel_A2.id],
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A1.id]: channel_A1,
                            [channel_A2.id]: channel_A2,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getLastViewedChannelForTeam(state, team_A.id);
            expect(channel).toStrictEqual(channel_A1);
        });

        it('should return null when last viewed channel for team is not in entities', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_A.id]: [channel_A1.id, channel_A2.id],
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A2.id]: channel_A2,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getLastViewedChannelForTeam(state, team_A.id);
            expect(channel).toStrictEqual(null);
        });

        it('should return null when last channels for team is empty array', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_A.id]: [],
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A1.id]: channel_A1,
                            [channel_A2.id]: channel_A2,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getLastViewedChannelForTeam(state, team_A.id);
            expect(channel).toBe(null);
        });

        it('should return null when no last channels for team', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A1.id]: channel_A1,
                            [channel_A2.id]: channel_A2,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getLastViewedChannelForTeam(state, team_A.id);
            expect(channel).toBe(null);
        });
    });

    describe('getPenultimateViewedChannelForTeam', () => {
        const {getPenultimateViewedChannelForTeam} = ViewSelectors;

        const team_A = TestHelper.fakeTeam();
        const channel_A1 = TestHelper.fakeChannelWithTeamId(team_A.id);
        const channel_A2 = TestHelper.fakeChannelWithTeamId(team_A.id);

        const team_B = TestHelper.fakeTeam();
        const channel_B1 = TestHelper.fakeChannelWithTeamId(team_B.id);
        const channel_B2 = TestHelper.fakeChannelWithTeamId(team_B.id);

        it('should return penultimate viewed channel for team', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_A.id]: [channel_A1.id, channel_A2.id],
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A1.id]: channel_A1,
                            [channel_A2.id]: channel_A2,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getPenultimateViewedChannelForTeam(state, team_A.id);
            expect(channel).toStrictEqual(channel_A2);
        });

        it('should return null when penultimate viewed channel for team is not in entities', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_A.id]: [channel_A1.id, channel_A2.id],
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A1.id]: channel_A1,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getPenultimateViewedChannelForTeam(state, team_A.id);
            expect(channel).toStrictEqual(null);
        });

        it('should return null when last channels length for team is < 2', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_A.id]: [channel_A1.id],
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A1.id]: channel_A1,
                            [channel_A2.id]: channel_A2,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getPenultimateViewedChannelForTeam(state, team_A.id);
            expect(channel).toStrictEqual(null);
        });

        it('should return null when no last channels for team', () => {
            const state = {
                views: {
                    team: {
                        lastChannelForTeam: {
                            [team_B.id]: [channel_B1.id, channel_B2.id],
                        },
                    },
                },
                entities: {
                    channels: {
                        channels: {
                            [channel_A1.id]: channel_A1,
                            [channel_A2.id]: channel_A2,
                            [channel_B1.id]: channel_B1,
                            [channel_B2.id]: channel_B2,
                        },
                    },
                },
            };

            const channel = getPenultimateViewedChannelForTeam(state, team_A.id);
            expect(channel).toBe(null);
        });
    });
});