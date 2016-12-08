// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'actions/teams';
import Client from 'client';
import configureStore from 'store/configureStore';
import {RequestStatus} from 'constants';
import TestHelper from 'test_helper';

describe('Actions.Teams', () => {
    it('selectTeam', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const currentTeamId = store.getState().entities.teams.currentId;
                assert.ok(currentTeamId);
                assert.equal(currentTeamId, TestHelper.basicTeam.id);
                done();
            });

            Actions.selectTeam(TestHelper.basicTeam)(store.dispatch, store.getState);
        });
    });

    it('fetchTeams', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const teamsRequest = store.getState().requests.teams.allTeams;
                const teams = store.getState().entities.teams.teams;

                if (teamsRequest.status === RequestStatus.SUCCESS || teamsRequest.status === RequestStatus.FAILURE) {
                    if (teamsRequest.error) {
                        done(new Error(JSON.stringify(teamsRequest.error)));
                    } else {
                        assert.ok(teams);
                        assert.ok(teams[TestHelper.basicTeam.id]);
                        done();
                    }
                }
            });

            Actions.fetchTeams()(store.dispatch, store.getState);
        });
    });

    it('getAllTeamListings', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            store.subscribe(() => {
                const teamsRequest = store.getState().requests.teams.getAllTeamListings;
                const teams = store.getState().entities.teams.teams;
                const openIds = store.getState().entities.teams.openTeamIds;

                if (teamsRequest.status === RequestStatus.SUCCESS || teamsRequest.status === RequestStatus.FAILURE) {
                    if (teamsRequest.error) {
                        done(new Error(JSON.stringify(teamsRequest.error)));
                    } else {
                        assert.ok(Object.keys(teams).length > 0);
                        for (const teamId in teams) {
                            if (teams.hasOwnProperty(teamId)) {
                                assert.ok(openIds.has(teamId));
                            }
                        }
                        done();
                    }
                }
            });

            const team = TestHelper.fakeTeam();
            team.allow_open_invite = true;
            await Client.createTeam(team);
            Actions.getAllTeamListings()(store.dispatch, store.getState);
        });
    });

    it('createTeam', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const createRequest = store.getState().requests.teams.createTeam;
                const teams = store.getState().entities.teams.teams;
                const members = store.getState().entities.teams.myMembers;
                const current = store.getState().entities.teams.currentId;

                if (createRequest.status === RequestStatus.SUCCESS || createRequest.status === RequestStatus.FAILURE) {
                    if (createRequest.error) {
                        done(new Error(JSON.stringify(createRequest.error)));
                    } else {
                        const teamId = Object.keys(teams)[0];
                        assert.strictEqual(Object.keys(teams).length, 1);
                        assert.strictEqual(current, teamId);
                        assert.ok(members[teamId]);
                        done();
                    }
                }
            });

            Actions.createTeam(
                TestHelper.basicUser.id,
                TestHelper.fakeTeam()
            )(store.dispatch, store.getState);
        });
    });

    it('updateTeam', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();
            const displayName = 'The Updated Team';
            const description = 'This is a team created by unit tests';

            store.subscribe(() => {
                const updateRequest = store.getState().requests.teams.updateTeam;
                const teams = store.getState().entities.teams.teams;

                if (updateRequest.status === RequestStatus.SUCCESS || updateRequest.status === RequestStatus.FAILURE) {
                    if (updateRequest.error) {
                        done(new Error(JSON.stringify(updateRequest.error)));
                    } else {
                        const team = teams[TestHelper.basicTeam.id];
                        assert.ok(team);
                        assert.strictEqual(team.display_name, displayName);
                        assert.strictEqual(team.description, description);
                        done();
                    }
                }
            });

            const team = {
                ...TestHelper.basicTeam,
                display_name: displayName,
                description
            };
            Actions.updateTeam(team)(store.dispatch, store.getState);
        });
    });

    // TODO: uncomment when PLT-4167 is merged
    // it('getMyTeamMembers', (done) => {
    //     TestHelper.initBasic(Client).then(() => {
    //         const store = configureStore();
    //
    //         store.subscribe(() => {
    //             const membersRequest = store.getState().requests.teams.getMyTeamMembers;
    //             const members = store.getState().entities.teams.myMembers;
    //
    //             if (membersRequest.status === RequestStatus.SUCCESS || membersRequest.status === RequestStatus.FAILURE) {
    //                 if (membersRequest.error) {
    //                     done(new Error(JSON.stringify(membersRequest.error)));
    //                 } else {
    //                     assert.ok(members);
    //                     assert.ok(members[TestHelper.basicTeam.id]);
    //                     done();
    //                 }
    //             }
    //         });
    //
    //         Actions.getMyTeamMembers()(store.dispatch, store.getState);
    //     });
    // });

    it.only('getTeamMember', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const user = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            store.subscribe(() => {
                const membersRequest = store.getState().requests.teams.getTeamMembers;
                const members = store.getState().entities.teams.membersInTeam;

                if (membersRequest.status === RequestStatus.SUCCESS || membersRequest.status === RequestStatus.FAILURE) {
                    if (membersRequest.error) {
                        done(new Error(JSON.stringify(membersRequest.error)));
                    } else {
                        assert.ok(members[TestHelper.basicTeam.id]);
                        assert.ok(members[TestHelper.basicTeam.id].has(user.id));
                        done();
                    }
                }
            });

            Actions.getTeamMember(TestHelper.basicTeam.id, user.id)(store.dispatch, store.getState);
        });
    });

    it('getTeamMembersByIds', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();

            const user1 = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            const user2 = await TestHelper.basicClient.createUserWithInvite(
                TestHelper.fakeUser(),
                null,
                null,
                TestHelper.basicTeam.invite_id
            );

            store.subscribe(() => {
                const membersRequest = store.getState().requests.teams.getTeamMembers;
                const members = store.getState().entities.teams.membersInTeam;

                if (membersRequest.status === RequestStatus.SUCCESS || membersRequest.status === RequestStatus.FAILURE) {
                    if (membersRequest.error) {
                        done(new Error(JSON.stringify(membersRequest.error)));
                    } else {
                        assert.ok(members[TestHelper.basicTeam.id]);
                        assert.ok(members[TestHelper.basicTeam.id].has(user1.id));
                        assert.ok(members[TestHelper.basicTeam.id].has(user2.id));
                        done();
                    }
                }
            });

            Actions.getTeamMembersByIds(
                TestHelper.basicTeam.id,
                [user1.id, user2.id]
            )(store.dispatch, store.getState);
        });
    }).timeout(3000);

    it('getTeamStats', (done) => {
        TestHelper.initBasic(Client).then(() => {
            const store = configureStore();

            store.subscribe(() => {
                const stats = store.getState().entities.teams.stats;
                const statsRequest = store.getState().requests.teams.getTeamStats;

                if (statsRequest.status === RequestStatus.SUCCESS) {
                    const stat = stats[TestHelper.basicTeam.id];
                    assert.ok(stat);
                    assert.equal(stat.total_member_count, 1);
                    assert.equal(stat.active_member_count, 1);
                    done();
                } else if (statsRequest.status === RequestStatus.FAILURE) {
                    done(new Error(JSON.stringify(statsRequest.error)));
                }
            });

            Actions.getTeamStats(TestHelper.basicTeam.id)(store.dispatch, store.getState);
        });
    });

    it('addUserToTeam', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUser(TestHelper.fakeUser());

            store.subscribe(() => {
                const membersRequest = store.getState().requests.teams.addUserToTeam;
                const members = store.getState().entities.teams.membersInTeam;

                if (membersRequest.status === RequestStatus.SUCCESS || membersRequest.status === RequestStatus.FAILURE) {
                    if (membersRequest.error) {
                        done(new Error(JSON.stringify(membersRequest.error)));
                    } else {
                        assert.ok(members[TestHelper.basicTeam.id]);
                        assert.ok(members[TestHelper.basicTeam.id].has(user.id));
                        done();
                    }
                }
            });

            Actions.addUserToTeam(TestHelper.basicTeam.id, user.id)(store.dispatch, store.getState);
        });
    });

    it('removeUserFromTeam', (done) => {
        TestHelper.initBasic(Client).then(async () => {
            const store = configureStore();
            const user = await TestHelper.basicClient.createUser(TestHelper.fakeUser());

            store.subscribe(() => {
                const addRequest = store.getState().requests.teams.addUserToTeam;
                const removeRequest = store.getState().requests.teams.removeUserFromTeam;
                const members = store.getState().entities.teams.membersInTeam;

                if (removeRequest.status === RequestStatus.SUCCESS || removeRequest.status === RequestStatus.FAILURE) {
                    if (removeRequest.error) {
                        done(new Error(JSON.stringify(removeRequest.error)));
                    } else {
                        assert.ok(members[TestHelper.basicTeam.id]);
                        assert.ok(!members[TestHelper.basicTeam.id].has(user.id));
                        done();
                    }
                }

                if (removeRequest.status === RequestStatus.NOT_STARTED &&
                    (addRequest.status === RequestStatus.SUCCESS || addRequest.status === RequestStatus.FAILURE)) {
                    if (addRequest.error) {
                        done(new Error(JSON.stringify(addRequest.error)));
                    } else {
                        assert.ok(members[TestHelper.basicTeam.id]);
                        assert.ok(members[TestHelper.basicTeam.id].has(user.id));
                        Actions.removeUserFromTeam(TestHelper.basicTeam.id, user.id)(store.dispatch, store.getState);
                    }
                }
            });

            Actions.addUserToTeam(TestHelper.basicTeam.id, user.id)(store.dispatch, store.getState);
        });
    });
});
