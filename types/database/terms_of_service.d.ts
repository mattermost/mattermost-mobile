import { Model } from '@nozbe/watermelondb';
export default class Terms_of_service extends Model {
    static table: string;
    acceptedAt: number;
    termsOfServiceId: string;
}
