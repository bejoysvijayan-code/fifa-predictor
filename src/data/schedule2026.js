// FIFA World Cup 2026 – Complete Group Stage Schedule
// Source: Sky Sports / FIFA official schedule
// Times stored in UTC. Browser converts to local timezone automatically.
// Matchday 3 pairs marked with same kickoffUTC (simultaneous within group).

export const FIFA2026_GROUPS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
  B: ['Canada', 'Bosnia-Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['USA', 'Paraguay', 'Australia', 'Turkey'],
  E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

export const FIFA2026_SCHEDULE = [
  // ── MATCHDAY 1 ─────────────────────────────────────────────────────
  // Group A
  { matchNumber: 1,  group: 'A', matchday: 1, homeTeam: 'Mexico',             awayTeam: 'South Africa',     kickoffUTC: '2026-06-11T18:00:00Z', venue: 'Mexico City'   },
  { matchNumber: 2,  group: 'A', matchday: 1, homeTeam: 'South Korea',         awayTeam: 'Czech Republic',   kickoffUTC: '2026-06-12T22:00:00Z', venue: 'Zapopan'       },
  // Group B
  { matchNumber: 3,  group: 'B', matchday: 1, homeTeam: 'Canada',              awayTeam: 'Bosnia-Herzegovina', kickoffUTC: '2026-06-12T19:00:00Z', venue: 'Toronto'     },
  { matchNumber: 4,  group: 'B', matchday: 1, homeTeam: 'Qatar',               awayTeam: 'Switzerland',      kickoffUTC: '2026-06-13T19:00:00Z', venue: 'Santa Clara'   },
  // Group C
  { matchNumber: 5,  group: 'C', matchday: 1, homeTeam: 'Brazil',              awayTeam: 'Morocco',          kickoffUTC: '2026-06-13T22:00:00Z', venue: 'New Jersey'    },
  { matchNumber: 6,  group: 'C', matchday: 1, homeTeam: 'Haiti',               awayTeam: 'Scotland',         kickoffUTC: '2026-06-14T01:00:00Z', venue: 'Foxborough'    },
  // Group D
  { matchNumber: 7,  group: 'D', matchday: 1, homeTeam: 'USA',                 awayTeam: 'Paraguay',         kickoffUTC: '2026-06-14T00:00:00Z', venue: 'Los Angeles'   },
  { matchNumber: 8,  group: 'D', matchday: 1, homeTeam: 'Australia',           awayTeam: 'Turkey',           kickoffUTC: '2026-06-14T04:00:00Z', venue: 'Vancouver'     },
  // Group E
  { matchNumber: 9,  group: 'E', matchday: 1, homeTeam: 'Germany',             awayTeam: 'Curacao',          kickoffUTC: '2026-06-14T17:00:00Z', venue: 'Houston'       },
  { matchNumber: 10, group: 'E', matchday: 1, homeTeam: 'Ivory Coast',         awayTeam: 'Ecuador',          kickoffUTC: '2026-06-14T23:00:00Z', venue: 'Philadelphia'  },
  // Group F
  { matchNumber: 11, group: 'F', matchday: 1, homeTeam: 'Netherlands',         awayTeam: 'Japan',            kickoffUTC: '2026-06-14T20:00:00Z', venue: 'Arlington'     },
  { matchNumber: 12, group: 'F', matchday: 1, homeTeam: 'Sweden',              awayTeam: 'Tunisia',          kickoffUTC: '2026-06-15T02:00:00Z', venue: 'Guadalupe'     },
  // Group G
  { matchNumber: 13, group: 'G', matchday: 1, homeTeam: 'Belgium',             awayTeam: 'Egypt',            kickoffUTC: '2026-06-15T19:00:00Z', venue: 'Seattle'       },
  { matchNumber: 14, group: 'G', matchday: 1, homeTeam: 'Iran',                awayTeam: 'New Zealand',      kickoffUTC: '2026-06-16T01:00:00Z', venue: 'Los Angeles'   },
  // Group H
  { matchNumber: 15, group: 'H', matchday: 1, homeTeam: 'Spain',               awayTeam: 'Cape Verde',       kickoffUTC: '2026-06-15T16:00:00Z', venue: 'Atlanta'       },
  { matchNumber: 16, group: 'H', matchday: 1, homeTeam: 'Saudi Arabia',        awayTeam: 'Uruguay',          kickoffUTC: '2026-06-15T22:00:00Z', venue: 'Miami'         },
  // Group I
  { matchNumber: 17, group: 'I', matchday: 1, homeTeam: 'France',              awayTeam: 'Senegal',          kickoffUTC: '2026-06-16T19:00:00Z', venue: 'New Jersey'    },
  { matchNumber: 18, group: 'I', matchday: 1, homeTeam: 'Iraq',                awayTeam: 'Norway',           kickoffUTC: '2026-06-16T22:00:00Z', venue: 'Foxborough'    },
  // Group J
  { matchNumber: 19, group: 'J', matchday: 1, homeTeam: 'Argentina',           awayTeam: 'Algeria',          kickoffUTC: '2026-06-17T01:00:00Z', venue: 'Kansas City'   },
  { matchNumber: 20, group: 'J', matchday: 1, homeTeam: 'Austria',             awayTeam: 'Jordan',           kickoffUTC: '2026-06-17T04:00:00Z', venue: 'Santa Clara'   },
  // Group K
  { matchNumber: 21, group: 'K', matchday: 1, homeTeam: 'Portugal',            awayTeam: 'DR Congo',         kickoffUTC: '2026-06-17T17:00:00Z', venue: 'Houston'       },
  { matchNumber: 22, group: 'K', matchday: 1, homeTeam: 'Uzbekistan',          awayTeam: 'Colombia',         kickoffUTC: '2026-06-18T02:00:00Z', venue: 'Mexico City'   },
  // Group L
  { matchNumber: 23, group: 'L', matchday: 1, homeTeam: 'England',             awayTeam: 'Croatia',          kickoffUTC: '2026-06-17T20:00:00Z', venue: 'Arlington'     },
  { matchNumber: 24, group: 'L', matchday: 1, homeTeam: 'Ghana',               awayTeam: 'Panama',           kickoffUTC: '2026-06-17T23:00:00Z', venue: 'Toronto'       },

  // ── MATCHDAY 2 ─────────────────────────────────────────────────────
  // Group A
  { matchNumber: 25, group: 'A', matchday: 2, homeTeam: 'Czech Republic',      awayTeam: 'South Africa',     kickoffUTC: '2026-06-18T16:00:00Z', venue: 'Atlanta'       },
  { matchNumber: 26, group: 'A', matchday: 2, homeTeam: 'Mexico',              awayTeam: 'South Korea',      kickoffUTC: '2026-06-19T01:00:00Z', venue: 'Zapopan'       },
  // Group B
  { matchNumber: 27, group: 'B', matchday: 2, homeTeam: 'Switzerland',         awayTeam: 'Bosnia-Herzegovina', kickoffUTC: '2026-06-18T19:00:00Z', venue: 'Los Angeles' },
  { matchNumber: 28, group: 'B', matchday: 2, homeTeam: 'Canada',              awayTeam: 'Qatar',            kickoffUTC: '2026-06-18T22:00:00Z', venue: 'Vancouver'     },
  // Group C
  { matchNumber: 29, group: 'C', matchday: 2, homeTeam: 'Scotland',            awayTeam: 'Morocco',          kickoffUTC: '2026-06-19T22:00:00Z', venue: 'Foxborough'    },
  { matchNumber: 30, group: 'C', matchday: 2, homeTeam: 'Brazil',              awayTeam: 'Haiti',            kickoffUTC: '2026-06-20T00:30:00Z', venue: 'Philadelphia'  },
  // Group D
  { matchNumber: 31, group: 'D', matchday: 2, homeTeam: 'USA',                 awayTeam: 'Australia',        kickoffUTC: '2026-06-19T19:00:00Z', venue: 'Seattle'       },
  { matchNumber: 32, group: 'D', matchday: 2, homeTeam: 'Turkey',              awayTeam: 'Paraguay',         kickoffUTC: '2026-06-20T03:00:00Z', venue: 'Santa Clara'   },
  // Group E
  { matchNumber: 33, group: 'E', matchday: 2, homeTeam: 'Germany',             awayTeam: 'Ivory Coast',      kickoffUTC: '2026-06-20T20:00:00Z', venue: 'Toronto'       },
  { matchNumber: 34, group: 'E', matchday: 2, homeTeam: 'Ecuador',             awayTeam: 'Curacao',          kickoffUTC: '2026-06-21T00:00:00Z', venue: 'Kansas City'   },
  // Group F
  { matchNumber: 35, group: 'F', matchday: 2, homeTeam: 'Netherlands',         awayTeam: 'Sweden',           kickoffUTC: '2026-06-20T17:00:00Z', venue: 'Houston'       },
  { matchNumber: 36, group: 'F', matchday: 2, homeTeam: 'Tunisia',             awayTeam: 'Japan',            kickoffUTC: '2026-06-21T04:00:00Z', venue: 'Guadalupe'     },
  // Group G
  { matchNumber: 37, group: 'G', matchday: 2, homeTeam: 'Belgium',             awayTeam: 'Iran',             kickoffUTC: '2026-06-21T19:00:00Z', venue: 'Los Angeles'   },
  { matchNumber: 38, group: 'G', matchday: 2, homeTeam: 'New Zealand',         awayTeam: 'Egypt',            kickoffUTC: '2026-06-22T01:00:00Z', venue: 'Vancouver'     },
  // Group H
  { matchNumber: 39, group: 'H', matchday: 2, homeTeam: 'Spain',               awayTeam: 'Saudi Arabia',     kickoffUTC: '2026-06-21T16:00:00Z', venue: 'Atlanta'       },
  { matchNumber: 40, group: 'H', matchday: 2, homeTeam: 'Uruguay',             awayTeam: 'Cape Verde',       kickoffUTC: '2026-06-21T22:00:00Z', venue: 'Miami'         },
  // Group I
  { matchNumber: 41, group: 'I', matchday: 2, homeTeam: 'France',              awayTeam: 'Iraq',             kickoffUTC: '2026-06-22T21:00:00Z', venue: 'Philadelphia'  },
  { matchNumber: 42, group: 'I', matchday: 2, homeTeam: 'Norway',              awayTeam: 'Senegal',          kickoffUTC: '2026-06-23T00:00:00Z', venue: 'Toronto'       },
  // Group J
  { matchNumber: 43, group: 'J', matchday: 2, homeTeam: 'Argentina',           awayTeam: 'Austria',          kickoffUTC: '2026-06-22T17:00:00Z', venue: 'Arlington'     },
  { matchNumber: 44, group: 'J', matchday: 2, homeTeam: 'Jordan',              awayTeam: 'Algeria',          kickoffUTC: '2026-06-23T03:00:00Z', venue: 'Santa Clara'   },
  // Group K
  { matchNumber: 45, group: 'K', matchday: 2, homeTeam: 'Portugal',            awayTeam: 'Uzbekistan',       kickoffUTC: '2026-06-23T17:00:00Z', venue: 'Houston'       },
  { matchNumber: 46, group: 'K', matchday: 2, homeTeam: 'Colombia',            awayTeam: 'DR Congo',         kickoffUTC: '2026-06-24T02:00:00Z', venue: 'Zapopan'       },
  // Group L
  { matchNumber: 47, group: 'L', matchday: 2, homeTeam: 'England',             awayTeam: 'Ghana',            kickoffUTC: '2026-06-23T20:00:00Z', venue: 'Foxborough'    },
  { matchNumber: 48, group: 'L', matchday: 2, homeTeam: 'Panama',              awayTeam: 'Croatia',          kickoffUTC: '2026-06-23T23:00:00Z', venue: 'Foxborough'    },

  // ── MATCHDAY 3 (simultaneous within each group) ─────────────────────
  // Group B (June 24, 19:00 UTC)
  { matchNumber: 49, group: 'B', matchday: 3, homeTeam: 'Switzerland',         awayTeam: 'Canada',           kickoffUTC: '2026-06-24T19:00:00Z', venue: 'Vancouver'     },
  { matchNumber: 50, group: 'B', matchday: 3, homeTeam: 'Bosnia-Herzegovina',  awayTeam: 'Qatar',            kickoffUTC: '2026-06-24T19:00:00Z', venue: 'Seattle'       },
  // Group C (June 24, 22:00 UTC)
  { matchNumber: 51, group: 'C', matchday: 3, homeTeam: 'Morocco',             awayTeam: 'Haiti',            kickoffUTC: '2026-06-24T22:00:00Z', venue: 'Atlanta'       },
  { matchNumber: 52, group: 'C', matchday: 3, homeTeam: 'Scotland',            awayTeam: 'Brazil',           kickoffUTC: '2026-06-24T22:00:00Z', venue: 'Miami'         },
  // Group A (June 25, 01:00 UTC)
  { matchNumber: 53, group: 'A', matchday: 3, homeTeam: 'South Africa',        awayTeam: 'South Korea',      kickoffUTC: '2026-06-25T01:00:00Z', venue: 'Guadalupe'     },
  { matchNumber: 54, group: 'A', matchday: 3, homeTeam: 'Czech Republic',      awayTeam: 'Mexico',           kickoffUTC: '2026-06-25T01:00:00Z', venue: 'Mexico City'   },
  // Group E (June 25, 20:00 UTC)
  { matchNumber: 55, group: 'E', matchday: 3, homeTeam: 'Curacao',             awayTeam: 'Ivory Coast',      kickoffUTC: '2026-06-25T20:00:00Z', venue: 'Philadelphia'  },
  { matchNumber: 56, group: 'E', matchday: 3, homeTeam: 'Ecuador',             awayTeam: 'Germany',          kickoffUTC: '2026-06-25T20:00:00Z', venue: 'New Jersey'    },
  // Group F (June 25, 23:00 UTC)
  { matchNumber: 57, group: 'F', matchday: 3, homeTeam: 'Tunisia',             awayTeam: 'Netherlands',      kickoffUTC: '2026-06-25T23:00:00Z', venue: 'Kansas City'   },
  { matchNumber: 58, group: 'F', matchday: 3, homeTeam: 'Japan',               awayTeam: 'Sweden',           kickoffUTC: '2026-06-25T23:00:00Z', venue: 'Arlington'     },
  // Group D (June 26, 02:00 UTC)
  { matchNumber: 59, group: 'D', matchday: 3, homeTeam: 'Turkey',              awayTeam: 'USA',              kickoffUTC: '2026-06-26T02:00:00Z', venue: 'Los Angeles'   },
  { matchNumber: 60, group: 'D', matchday: 3, homeTeam: 'Paraguay',            awayTeam: 'Australia',        kickoffUTC: '2026-06-26T02:00:00Z', venue: 'Santa Clara'   },
  // Group K (June 26, 13:00 UTC)
  { matchNumber: 61, group: 'K', matchday: 3, homeTeam: 'Portugal',            awayTeam: 'Colombia',         kickoffUTC: '2026-06-26T13:00:00Z', venue: 'Houston'       },
  { matchNumber: 62, group: 'K', matchday: 3, homeTeam: 'DR Congo',            awayTeam: 'Uzbekistan',       kickoffUTC: '2026-06-26T13:00:00Z', venue: 'Zapopan'       },
  // Group I (June 26, 19:00 UTC)
  { matchNumber: 63, group: 'I', matchday: 3, homeTeam: 'Norway',              awayTeam: 'France',           kickoffUTC: '2026-06-26T19:00:00Z', venue: 'Foxborough'    },
  { matchNumber: 64, group: 'I', matchday: 3, homeTeam: 'Senegal',             awayTeam: 'Iraq',             kickoffUTC: '2026-06-26T19:00:00Z', venue: 'Toronto'       },
  // Group J (June 26, 22:00 UTC)
  { matchNumber: 65, group: 'J', matchday: 3, homeTeam: 'Argentina',           awayTeam: 'Jordan',           kickoffUTC: '2026-06-26T22:00:00Z', venue: 'Kansas City'   },
  { matchNumber: 66, group: 'J', matchday: 3, homeTeam: 'Algeria',             awayTeam: 'Austria',          kickoffUTC: '2026-06-26T22:00:00Z', venue: 'Santa Clara'   },
  // Group H (June 27, 00:00 UTC)
  { matchNumber: 67, group: 'H', matchday: 3, homeTeam: 'Cape Verde',          awayTeam: 'Saudi Arabia',     kickoffUTC: '2026-06-27T00:00:00Z', venue: 'Houston'       },
  { matchNumber: 68, group: 'H', matchday: 3, homeTeam: 'Uruguay',             awayTeam: 'Spain',            kickoffUTC: '2026-06-27T00:00:00Z', venue: 'Zapopan'       },
  // Group G (June 27, 03:00 UTC)
  { matchNumber: 69, group: 'G', matchday: 3, homeTeam: 'New Zealand',         awayTeam: 'Belgium',          kickoffUTC: '2026-06-27T03:00:00Z', venue: 'Vancouver'     },
  { matchNumber: 70, group: 'G', matchday: 3, homeTeam: 'Egypt',               awayTeam: 'Iran',             kickoffUTC: '2026-06-27T03:00:00Z', venue: 'Seattle'       },
  // Group L (June 27, 21:00 UTC)
  { matchNumber: 71, group: 'L', matchday: 3, homeTeam: 'Panama',              awayTeam: 'England',          kickoffUTC: '2026-06-27T21:00:00Z', venue: 'New Jersey'    },
  { matchNumber: 72, group: 'L', matchday: 3, homeTeam: 'Croatia',             awayTeam: 'Ghana',            kickoffUTC: '2026-06-27T21:00:00Z', venue: 'Philadelphia'  },
];
