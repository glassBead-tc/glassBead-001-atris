// import { Track, User } from "@audius/sdk";
// import { getAudiusSdk } from "../../../sdkClient.js";
// import type { 
//     GetTracksByUserRequest,
//     GetTracksByUserSortEnum,
//     GetTracksByUserSortMethodEnum,
//     GetTracksByUserSortDirectionEnum,
//     GetTracksByUserFilterTracksEnum
// } from "@audius/sdk";

// export async function getUserTracks(params: GetTracksByUserRequest): Promise<Track[]> {
//     const sdk = await getAudiusSdk();  // Will return the same instance
//     const response = await sdk.users.getTracksByUser(params);
//     return response.data || [];
// }

// export async function getUserFollowers(params: {
//     id: string;
//     offset?: number;
//     limit?: number;
// }): Promise<User[]> {
//     const response = await getAudiusSdk().then(sdk => sdk.users.getFollowers(params));
//     return response.data || [];
// }

// export async function getUserFollowing(params: {
//     id: string;
//     offset?: number;
//     limit?: number;
// }): Promise<User[]> {
//     const response = await getAudiusSdk().then(sdk => sdk.users.getFollowing(params));
//     return response.data || [];
// }
