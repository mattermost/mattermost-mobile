// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Query, type Relation} from '@nozbe/watermelondb';
import {children, field, immutableRelation, json} from '@nozbe/watermelondb/decorators';
import Model, {type Associations} from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {safeParseJSONStringArray} from '@utils/helpers';

import type PlaybookRunModelInterface from '@playbooks//types/database/models/playbook_run';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type {SyncStatus} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const {
    CHANNEL,
    POST,
    TEAM,
    USER,
} = MM_TABLES.SERVER;

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST} = PLAYBOOK_TABLES;

/**
 * The PlaybookRun model represents a playbook run in the Mattermost app.
 */
export default class PlaybookRunModel extends Model implements PlaybookRunModelInterface {
    /** table (name) : PlaybookRun */
    static table = PLAYBOOK_RUN;

    /** associations : Describes every relationship to this table. */
    static associations: Associations = {

        /** A PLAYBOOK_RUN could have been created by a POST (relationship is 1:1) */
        [POST]: {type: 'belongs_to', key: 'post_id'},

        /** A CHANNEL can be associated to one PLAYBOOK_RUN (relationship is 1:1) */
        [CHANNEL]: {type: 'belongs_to', key: 'channel_id'},

        /** A TEAM can be associated to PLAYBOOK_RUN (relationship is 1:1) */
        [TEAM]: {type: 'belongs_to', key: 'team_id'},

        /** A USER that commands the PLAYBOOK_RUN (relationship is 1:1) */
        [USER]: {type: 'belongs_to', key: 'owner_user_id'},

        [PLAYBOOK_CHECKLIST]: {type: 'has_many', foreignKey: 'run_id'},
    };

    /** playbook_id : The id of the playbook this run belongs to */
    @field('playbook_id') playbookId!: string;

    /** name : Name of the playbook run */
    @field('name') name!: string;

    /** description : Description of the playbook run */
    @field('description') description!: string;

    /** is_active : Whether the run is still active */
    @field('is_active') isActive!: boolean;

    /** owner_user_id : Foreign key to the user commanding the run */
    @field('owner_user_id') ownerUserId!: string;

    /** team_id : Foreign key to the team this run belongs to */
    @field('team_id') teamId!: string;

    /** channel_id : Foreign key to the channel this run belongs to */
    @field('channel_id') channelId!: string;

    /** post_id : ID of the post that created the run (nullable) */
    @field('post_id') postId!: string | null;

    /** create_at : Timestamp when the run was created */
    @field('create_at') createAt!: number;

    /** end_at: Timestamp when the run ended (0 if not finished) */
    @field('end_at') endAt!: number;

    /** active_stage : Zero-based index of the currently active stage */
    @field('active_stage') activeStage!: number;

    /** active_stage_title : Name of the current active stage */
    @field('active_stage_title') activeStageTitle!: string;

    /** participant_ids : An array of user IDs that participate in the run */
    @json('participant_ids', safeParseJSONStringArray) participantIds!: string[];

    /** summary : Summary of the playbook run */
    @field('summary') summary!: string;

    /** current_status : The current status of the playbook run */
    @field('current_status') currentStatus!: PlaybookRunStatusType;

    /** last_status_update_at : Timestamp of the last status update */
    @field('last_status_update_at') lastStatusUpdateAt!: number;

    /** retrospective_enabled : Indicates if retrospective is enabled for the run */
    @field('retrospective_enabled') retrospectiveEnabled!: boolean;

    /** retrospective : The retrospective details for the run */
    @field('retrospective') retrospective!: string;

    /** retrospective_published_at : Timestamp when the retrospective was published */
    @field('retrospective_published_at') retrospectivePublishedAt!: number;

    /** sync : The sync status of the playbook run */
    @field('sync') sync!: SyncStatus;

    /** last_sync_at : The timestamp when the playbook run was last synced */
    @field('last_sync_at') lastSyncAt!: number;

    /** previous_reminder : Timestamp of the previous reminder */
    @field('previous_reminder') previousReminder!: number;

    /** items_order : The sort order of the playbook run */
    @json('items_order', safeParseJSONStringArray) itemsOrder!: string[];

    /** update_at : The timestamp when the playbook run was updated */
    @field('update_at') updateAt!: number;

    /** post : The POST to which this PLAYBOOK_RUN belongs (can be null) */
    @immutableRelation(POST, 'post_id') post!: Relation<PostModel>;

    /** team : The TEAM to which the run CHANNEL belongs */
    @immutableRelation(TEAM, 'team_id') team!: Relation<TeamModel>;

    /** channel : The CHANNEL to which this PLAYBOOK_RUN belongs */
    @immutableRelation(CHANNEL, 'channel_id') channel!: Relation<ChannelModel>;

    /** creator : The USER who created this CHANNEL*/
    @immutableRelation(USER, 'owner_user_id') owner!: Relation<UserModel>;

    @children(PLAYBOOK_CHECKLIST) checklists!: Query<PlaybookChecklistModel>;

    participants = (): Query<UserModel> => {
        const filteredParticipantIds = this.participantIds.filter((id) => id !== this.ownerUserId);
        return this.database.get<UserModel>(USER).query(Q.where('id', Q.oneOf(filteredParticipantIds)));
    };

    prepareDestroyWithRelations = async (): Promise<Model[]> => {
        const preparedModels: Model[] = [this.prepareDestroyPermanently()];

        const checklists = await this.checklists?.fetch();
        if (checklists?.length) {
            for await (const checklist of checklists) {
                const preparedChecklist = await checklist.prepareDestroyWithRelations();
                preparedModels.push(...preparedChecklist);
            }
        }

        return preparedModels;
    };
}
