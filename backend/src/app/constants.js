import path from "path";
export const TRIMMED_CORPUS_PATH = path.resolve('', '../data/audius_corpus.json');
export const HIGH_LEVEL_CATEGORY_MAPPING = {
    Tracks: [
        "Get Track",
        "Search Tracks",
        "Get Trending Tracks",
        "Get Bulk Tracks",
        "Get Underground Trending Tracks",
        "Stream Track"
    ],
    Users: [
        "Get User",
        "Search Users",
        "Get User By Handle",
        "Get User ID from Wallet",
        "Get User's Favorite Tracks",
        "Get User's Reposts",
        "Get User's Most Used Track Tags"
    ],
    Playlists: [
        "Get Playlist",
        "Search Playlists",
        "Get Trending Playlists"
    ],
    General: [
        "Audius Web Search"
    ],
    Tips: [
        "Get Tips"
    ],
    // Add any additional categories as needed
};
export var Genre;
(function (Genre) {
    Genre["ALL"] = "All Genres";
    Genre["ELECTRONIC"] = "Electronic";
    Genre["ROCK"] = "Rock";
    Genre["METAL"] = "Metal";
    Genre["ALTERNATIVE"] = "Alternative";
    Genre["HIP_HOP_RAP"] = "Hip-Hop/Rap";
    Genre["EXPERIMENTAL"] = "Experimental";
    Genre["PUNK"] = "Punk";
    Genre["FOLK"] = "Folk";
    Genre["POP"] = "Pop";
    Genre["AMBIENT"] = "Ambient";
    Genre["SOUNDTRACK"] = "Soundtrack";
    Genre["WORLD"] = "World";
    Genre["JAZZ"] = "Jazz";
    Genre["ACOUSTIC"] = "Acoustic";
    Genre["FUNK"] = "Funk";
    Genre["R_AND_B_SOUL"] = "R&B/Soul";
    Genre["DEVOTIONAL"] = "Devotional";
    Genre["CLASSICAL"] = "Classical";
    Genre["REGGAE"] = "Reggae";
    Genre["PODCASTS"] = "Podcasts";
    Genre["COUNTRY"] = "Country";
    Genre["SPOKEN_WORK"] = "Spoken Word";
    Genre["COMEDY"] = "Comedy";
    Genre["BLUES"] = "Blues";
    Genre["KIDS"] = "Kids";
    Genre["AUDIOBOOKS"] = "Audiobooks";
    Genre["LATIN"] = "Latin";
    Genre["LOFI"] = "Lo-Fi";
    Genre["HYPERPOP"] = "Hyperpop";
    Genre["DANCEHALL"] = "Dancehall";
    // Electronic Subgenres
    Genre["TECHNO"] = "Techno";
    Genre["TRAP"] = "Trap";
    Genre["HOUSE"] = "House";
    Genre["TECH_HOUSE"] = "Tech House";
    Genre["DEEP_HOUSE"] = "Deep House";
    Genre["DISCO"] = "Disco";
    Genre["ELECTRO"] = "Electro";
    Genre["JUNGLE"] = "Jungle";
    Genre["PROGRESSIVE_HOUSE"] = "Progressive House";
    Genre["HARDSTYLE"] = "Hardstyle";
    Genre["GLITCH_HOP"] = "Glitch Hop";
    Genre["TRANCE"] = "Trance";
    Genre["FUTURE_BASS"] = "Future Bass";
    Genre["FUTURE_HOUSE"] = "Future House";
    Genre["TROPICAL_HOUSE"] = "Tropical House";
    Genre["DOWNTEMPO"] = "Downtempo";
    Genre["DRUM_AND_BASS"] = "Drum & Bass";
    Genre["DUBSTEP"] = "Dubstep";
    Genre["JERSEY_CLUB"] = "Jersey Club";
    Genre["VAPORWAVE"] = "Vaporwave";
    Genre["MOOMBAHTON"] = "Moombahton";
})(Genre || (Genre = {}));
export var Mood;
(function (Mood) {
    Mood["PEACEFUL"] = "Peaceful";
    Mood["ROMANTIC"] = "Romantic";
    Mood["SENTIMENTAL"] = "Sentimental";
    Mood["TENDER"] = "Tender";
    Mood["EASYGOING"] = "Easygoing";
    Mood["YEARNING"] = "Yearning";
    Mood["SOPHISTICATED"] = "Sophisticated";
    Mood["SENSUAL"] = "Sensual";
    Mood["COOL"] = "Cool";
    Mood["GRITTY"] = "Gritty";
    Mood["MELANCHOLY"] = "Melancholy";
    Mood["SERIOUS"] = "Serious";
    Mood["BROODING"] = "Brooding";
    Mood["FIERY"] = "Fiery";
    Mood["DEFIANT"] = "Defiant";
    Mood["AGGRESSIVE"] = "Aggressive";
    Mood["ROWDY"] = "Rowdy";
    Mood["EXCITED"] = "Excited";
    Mood["ENERGIZING"] = "Energizing";
    Mood["EMPOWERING"] = "Empowering";
    Mood["STIRRING"] = "Stirring";
    Mood["UPBEAT"] = "Upbeat";
    Mood["OTHER"] = "Other";
})(Mood || (Mood = {}));
export var StemCategory;
(function (StemCategory) {
    StemCategory["INSTRUMENTAL"] = "INSTRUMENTAL";
    StemCategory["LEAD_VOCALS"] = "LEAD_VOCALS";
    StemCategory["MELODIC_LEAD"] = "MELODIC_LEAD";
    StemCategory["PAD"] = "PAD";
    StemCategory["SNARE"] = "SNARE";
    StemCategory["KICK"] = "KICK";
    StemCategory["HIHAT"] = "HIHAT";
    StemCategory["PERCUSSION"] = "PERCUSSION";
    StemCategory["SAMPLE"] = "SAMPLE";
    StemCategory["BACKING_VOX"] = "BACKING_VOX";
    StemCategory["BASS"] = "BASS";
    StemCategory["OTHER"] = "OTHER";
})(StemCategory || (StemCategory = {}));
