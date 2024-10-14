import { TrackData, UserData } from "../../../types.js";


export function getUserTracks(userId: string): TrackData[] {
    const tracks = getUserTracks(userId);
    return tracks;
}

export function getUserFollowers(userId: string): UserData[] {
    const followers = getUserFollowers(userId);
    return followers;
}

export function getUserFollowing(userId: string): UserData[] {
    const following = getUserFollowing(userId);
    return following;
}