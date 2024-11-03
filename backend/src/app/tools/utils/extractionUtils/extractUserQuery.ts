import { Track, User } from "@audius/sdk";
import { audiusSdk } from "../../../sdkClient.js";
import type { 
    GetTracksByUserRequest,
    GetTracksByUserSortEnum,
    GetTracksByUserSortMethodEnum,
    GetTracksByUserSortDirectionEnum,
    GetTracksByUserFilterTracksEnum
} from "@audius/sdk";

export async function getUserTracks(params: GetTracksByUserRequest): Promise<Track[]> {
    const response = await audiusSdk.users.getTracksByUser(params);
    return response.data || [];
}

export async function getUserFollowers(params: {
    id: string;
    offset?: number;
    limit?: number;
}): Promise<User[]> {
    const response = await audiusSdk.users.getFollowers(params);
    return response.data || [];
}

export async function getUserFollowing(params: {
    id: string;
    offset?: number;
    limit?: number;
}): Promise<User[]> {
    const response = await audiusSdk.users.getFollowing(params);
    return response.data || [];
}
