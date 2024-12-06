interface ApiTrack {
  title: string;
  user: {
    name: string;
  };
  play_count: number;
  favorite_count: number;
}

export function formatTracks(tracks: ApiTrack[]): string {
  return tracks
    .slice(0, 10)
    .map((track, index) => {
      const plays = track.play_count.toLocaleString();
      const favorites = track.favorite_count.toLocaleString();
      return `${index + 1}. "${track.title}" by ${track.user.name} (${plays} plays, ${favorites} favorites)`;
    })
    .join('\n');
} 