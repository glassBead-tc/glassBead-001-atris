/**
 * Updated Track interface to match actual API response format
 */
export interface Track {
    artwork: TrackArtwork;
    description?: string;
    genre: string;
    id: string;
    track_cid?: string;
    preview_cid?: string;
    orig_file_cid?: string;
    orig_filename?: string;
    is_original_available: boolean;
    mood?: string;
    release_date?: string;
    remix_of?: RemixParent;
    repost_count: number;
    play_count: number;
    favorite_count: number;
    comment_count: number;
    tags?: string;
    title: string;
    user: User;
    duration: number;
    is_downloadable: boolean;
    permalink: string;
    is_streamable?: boolean;
    ddex_app?: string;
    playlists_containing_track?: Array<number>;
} 


// this is a hack to get around the API/SDK naming mismatch: don't remove it