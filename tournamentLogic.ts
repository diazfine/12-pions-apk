import {
  Difficulty,
  LeagueStanding,
  PieceColor,
  TournamentFormat,
  TournamentMode,
  TournamentHistoryItem,
  TournamentMatch,
  TournamentParticipant,
  TournamentState,
} from '../types';

export interface RosterBot {
  id: string;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  diff: Difficulty;
  elo: number;
  playStyle: string;
}

export const BOT_ROSTER: RosterBot[] = [
  {
    id: 'bot_diaw',
    name: 'Diaw Grand Maître',
    avatar: '👑',
    country: 'Sénégal',
    flag: '🇸🇳',
    diff: 'hard',
    elo: 2380,
    playStyle: 'Calculateur Implacable & Combos de Dames',
  },
  {
    id: 'bot_koul',
    name: 'KoulMB L’Aigle',
    avatar: '🦅',
    country: 'Côte d’Ivoire',
    flag: '🇨🇮',
    diff: 'hard',
    elo: 2145,
    playStyle: 'Attaque Fulgurante & Pièges Tactiques',
  },
  {
    id: 'bot_keita',
    name: 'Keita Le Mur',
    avatar: '🛡️',
    country: 'Guinée',
    flag: '🇬🇳',
    diff: 'medium',
    elo: 1850,
    playStyle: 'Défense Hermétique & Patience',
  },
  {
    id: 'bot_traore',
    name: 'Traoré Le Piégeur',
    avatar: '⚡',
    country: 'Mali',
    flag: '🇲🇱',
    diff: 'medium',
    elo: 1720,
    playStyle: 'Sacrifices & Multi-prises Spectaculaires',
  },
  {
    id: 'bot_ndiaye',
    name: 'Ndiaye Le Rapide',
    avatar: '🐆',
    country: 'Sénégal',
    flag: '🇸🇳',
    diff: 'medium',
    elo: 1590,
    playStyle: 'Pression Constante & Contre-Attaque',
  },
  {
    id: 'bot_mansour',
    name: 'Mansour L’Atlas',
    avatar: '🦁',
    country: 'Maroc',
    flag: '🇲🇦',
    diff: 'medium',
    elo: 1520,
    playStyle: 'Course aux Dames & Géométrie',
  },
  {
    id: 'bot_oumar',
    name: 'Oumar Du Sahel',
    avatar: '🏜️',
    country: 'Mauritanie',
    flag: '🇲🇷',
    diff: 'easy',
    elo: 1420,
    playStyle: 'Jeu Positif & Ouvertures Classiques',
  },
  {
    id: 'bot_zongo',
    name: 'Zongo L’Étalon',
    avatar: '🐎',
    country: 'Burkina Faso',
    flag: '🇧🇫',
    diff: 'easy',
    elo: 1350,
    playStyle: 'Agressivité Tactique & Prises de Risque',
  },
  {
    id: 'bot_pierre',
    name: 'Pierre Le Stratège',
    avatar: '🎯',
    country: 'France',
    flag: '🇫🇷',
    diff: 'medium',
    elo: 1980,
    playStyle: 'Positionnel & Contrôle du Centre',
  },
  {
    id: 'bot_kenji',
    name: 'Kenji Le Samouraï',
    avatar: '🥷',
    country: 'Japon',
    flag: '🇯🇵',
    diff: 'hard',
    elo: 2290,
    playStyle: 'Discipline de Fer & Multi-prises Éclair',
  },
  {
    id: 'bot_carlos',
    name: 'Carlos Le Félidé',
    avatar: '🐆',
    country: 'Brésil',
    flag: '🇧🇷',
    diff: 'medium',
    elo: 1840,
    playStyle: 'Improvisation & Pièges Cachés',
  },
  {
    id: 'bot_alex',
    name: 'Alex The Titan',
    avatar: '🦅',
    country: 'États-Unis',
    flag: '🇺🇸',
    diff: 'hard',
    elo: 2180,
    playStyle: 'Attaque Agressive & Sacrifice de Dames',
  },
  {
    id: 'bot_fatou',
    name: 'Fatou La Reine',
    avatar: '👸',
    country: 'Sénégal',
    flag: '🇸🇳',
    diff: 'hard',
    elo: 2310,
    playStyle: 'Maîtrise Suprême & Blocage Impénétrable',
  },
  {
    id: 'bot_koffi',
    name: 'Koffi Le Sage',
    avatar: '🧙‍♂️',
    country: 'Ghana',
    flag: '🇬🇭',
    diff: 'medium',
    elo: 1780,
    playStyle: 'Contrôle des Diagonales & Patience',
  },
  {
    id: 'bot_dimitri',
    name: 'Dimitri L’Ours',
    avatar: '🐻',
    country: 'Russie',
    flag: '🇷🇺',
    diff: 'hard',
    elo: 2240,
    playStyle: 'Force Brute & Prises Multiples Implacables',
  },
  {
    id: 'bot_hassan',
    name: 'Hassan Le Faucon',
    avatar: '🦅',
    country: 'Égypte',
    flag: '🇪🇬',
    diff: 'medium',
    elo: 1890,
    playStyle: 'Vision Périphérique & Pièges Centraux',
  },
  {
    id: 'bot_miguel',
    name: 'Miguel El Toro',
    avatar: '🐂',
    country: 'Espagne',
    flag: '🇪🇸',
    diff: 'medium',
    elo: 1820,
    playStyle: 'Percée Frontale & Pression Continue',
  },
  {
    id: 'bot_yusuf',
    name: 'Yusuf Le Conquérant',
    avatar: '⚔️',
    country: 'Turquie',
    flag: '🇹🇷',
    diff: 'medium',
    elo: 1760,
    playStyle: 'Combinaisons Rapides & Défense Active',
  },
  {
    id: 'bot_li_wei',
    name: 'Li Wei Le Dragon',
    avatar: '🐉',
    country: 'Chine',
    flag: '🇨🇳',
    diff: 'hard',
    elo: 2350,
    playStyle: 'Art de la Guerre & Précision Chirurgicale',
  },
  {
    id: 'bot_arjun',
    name: 'Arjun Le Maître',
    avatar: '🧘‍♂️',
    country: 'Inde',
    flag: '🇮🇳',
    diff: 'hard',
    elo: 2190,
    playStyle: 'Concentration Absolue & Contre-Attaques',
  },
  {
    id: 'bot_bakary',
    name: 'Bakary La Flèche',
    avatar: '🏹',
    country: 'Gambie',
    flag: '🇬🇲',
    diff: 'easy',
    elo: 1410,
    playStyle: 'Vitesse de Jeu & Mouvements Spontanés',
  },
  {
    id: 'bot_souleymane',
    name: 'Souleymane Le Guépard',
    avatar: '🐆',
    country: 'Niger',
    flag: '🇳🇪',
    diff: 'easy',
    elo: 1390,
    playStyle: 'Course Rapide vers la Ligne de Dame',
  },
  {
    id: 'bot_alassane',
    name: 'Alassane Le Roc',
    avatar: '🗿',
    country: 'Bénin',
    flag: '🇧🇯',
    diff: 'medium',
    elo: 1680,
    playStyle: 'Structure Solide & Patience Infinie',
  },
  {
    id: 'bot_nguema',
    name: 'Nguema La Panthère',
    avatar: '🐾',
    country: 'Gabon',
    flag: '🇬🇦',
    diff: 'medium',
    elo: 1740,
    playStyle: 'Embuscades & Prises en Série',
  },
  {
    id: 'bot_chidi',
    name: 'Chidi Le Dynamiteur',
    avatar: '💥',
    country: 'Nigéria',
    flag: '🇳🇬',
    diff: 'hard',
    elo: 2120,
    playStyle: 'Attaque Furieuse & Sacrifices Payants',
  },
  {
    id: 'bot_lucas',
    name: 'Lucas Le Renard',
    avatar: '🦊',
    country: 'Belgique',
    flag: '🇧🇪',
    diff: 'medium',
    elo: 1810,
    playStyle: 'Ruses & Exploitation des Erreurs',
  },
  {
    id: 'bot_giovanni',
    name: 'Giovanni Il Maestro',
    avatar: '🎭',
    country: 'Italie',
    flag: '🇮🇹',
    diff: 'hard',
    elo: 2090,
    playStyle: 'Tactiques Classiques & Domination du Plateau',
  },
  {
    id: 'bot_kwame',
    name: 'Kwame L’Éclair',
    avatar: '⚡',
    country: 'Togo',
    flag: '🇹🇬',
    diff: 'easy',
    elo: 1430,
    playStyle: 'Audace & Déplacements Rapides',
  },
  {
    id: 'bot_tariq',
    name: 'Tariq Le Sphinx',
    avatar: '🏛️',
    country: 'Tunisie',
    flag: '🇹🇳',
    diff: 'medium',
    elo: 1860,
    playStyle: 'Défense Énigmatique & Pièges Cachés',
  },
  {
    id: 'bot_matteo',
    name: 'Matteo Le Cobra',
    avatar: '🐍',
    country: 'Argentine',
    flag: '🇦🇷',
    diff: 'hard',
    elo: 2150,
    playStyle: 'Morsure Éclair lors des Multi-prises',
  },
  {
    id: 'bot_hans',
    name: 'Hans Le Métronome',
    avatar: '⏱️',
    country: 'Allemagne',
    flag: '🇩🇪',
    diff: 'medium',
    elo: 1940,
    playStyle: 'Rigueur Méthodique & Zéro Faiblesse',
  },
];

export const COUNTRY_OPTIONS = [
  { name: 'Sénégal', flag: '🇸🇳' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Côte d’Ivoire', flag: '🇨🇮' },
  { name: 'Brésil', flag: '🇧🇷' },
  { name: 'Japon', flag: '🇯🇵' },
  { name: 'Maroc', flag: '🇲🇦' },
  { name: 'États-Unis', flag: '🇺🇸' },
  { name: 'Mali', flag: '🇲🇱' },
  { name: 'Guinée', flag: '🇬🇳' },
  { name: 'Espagne', flag: '🇪🇸' },
  { name: 'Burkina Faso', flag: '🇧🇫' },
  { name: 'Cameroun', flag: '🇨🇲' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Monde / International', flag: '🌍' },
];

const STORAGE_ACTIVE_TOURNAMENT = 'kharbga_active_tournament_v1';
const STORAGE_TOURNAMENT_HISTORY = 'kharbga_tournament_history_v1';

// Save & Load active tournament
export function saveActiveTournament(state: TournamentState | null): void {
  try {
    if (!state) {
      localStorage.removeItem(STORAGE_ACTIVE_TOURNAMENT);
    } else {
      localStorage.setItem(STORAGE_ACTIVE_TOURNAMENT, JSON.stringify(state));
    }
  } catch {
    // Storage catch
  }
}

export function loadActiveTournament(): TournamentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_TOURNAMENT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Tournament History
export function saveTournamentHistory(item: TournamentHistoryItem): void {
  try {
    const list = loadTournamentHistory();
    const updated = [item, ...list].slice(0, 30);
    localStorage.setItem(STORAGE_TOURNAMENT_HISTORY, JSON.stringify(updated));
  } catch {
    // Storage catch
  }
}

export function loadTournamentHistory(): TournamentHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_TOURNAMENT_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Fisher-Yates shuffle algorithm for completely unpredictable, mathematically unbiased lottery draws
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Create a new tournament
export function createTournament(
  format: TournamentFormat,
  userName: string,
  userCountry: string,
  userFlag: string,
  mode: TournamentMode = 'solo_ai',
  localPlayerNames: string[] = [],
  roomCode?: string
): TournamentState {
  const tournamentId = `tourn_${Date.now()}`;
  const participants: TournamentParticipant[] = [];

  const tournamentName =
    mode === 'solo_ai'
      ? (format === 'knockout32'
          ? '🏆 Grand Tournoi Solo vs Ordinateur (16e de Finale · 32 Maîtres)'
          : format === 'knockout16'
          ? '🏆 Championnat Solo vs Ordinateur (8e de Finale · 16 Maîtres)'
          : format === 'knockout8'
          ? '🏆 Tournoi Solo vs Ordinateur (Quarts de Finale · 8 Maîtres)'
          : '🏆 Tournoi Solo Express vs Ordinateur (Demi-Finales · 4 Maîtres)')
      : mode === 'local'
      ? (format === 'knockout32' ? '🎮 Tournoi Local (32 Joueurs)' : format === 'knockout16' ? '🎮 Tournoi Local (16 Joueurs)' : '🎮 Tournoi Local (8 Joueurs)')
      : '🌍 Matchmaking Mondial en Ligne (8 Joueurs)';

  const userParticipantId = 'p_user';

  if (mode === 'solo_ai') {
    // Solo vs AI mode: 1 Human + (31, 15, 7, or 3) bots
    participants.push({
      id: userParticipantId,
      name: userName.trim() || 'Vous (Champion)',
      avatar: '⭐',
      country: userCountry,
      flag: userFlag,
      isHuman: true,
      elo: 1500,
      playStyle: 'Votre style stratégique',
    });

    const neededBots = format === 'knockout32' ? 31 : format === 'knockout16' ? 15 : format === 'knockout8' ? 7 : 3;
    const shuffledBots = fisherYatesShuffle([...BOT_ROSTER]);
    for (let i = 0; i < neededBots; i++) {
      const b = shuffledBots[i % shuffledBots.length];
      participants.push({
        id: `${b.id}_${i}`,
        name: i >= shuffledBots.length ? `${b.name} Jr.` : b.name,
        avatar: b.avatar,
        country: b.country,
        flag: b.flag,
        isHuman: false,
        diff: b.diff,
        elo: b.elo + (i * 10),
        playStyle: b.playStyle,
      });
    }
  } else if (mode === 'local') {
    // Local Pass & Play tournament
    const totalCount = format === 'knockout32' ? 32 : format === 'knockout16' ? 16 : format === 'knockout8' ? 8 : 4;
    for (let i = 0; i < totalCount; i++) {
      const pName = localPlayerNames[i]?.trim() || `Joueur ${i + 1}`;
      const c = COUNTRY_OPTIONS[i % COUNTRY_OPTIONS.length];
      participants.push({
        id: `p_local_${i + 1}`,
        name: pName,
        avatar: ['👑', '⭐', '🔥', '🦅', '🦁', '⚡', '🛡️', '💎', '🐆', '🎯', '🐎', '🏜️', '🥷', '🚀', '🌟', '🏆'][i % 16],
        country: c.name,
        flag: c.flag,
        isHuman: true,
        elo: 1400 + i * 20,
        playStyle: 'Joueur Local',
      });
    }
  } else {
    // Global Matchmaking mode: 8 live matched online players
    participants.push({
      id: userParticipantId,
      name: userName.trim() || 'Vous (Champion)',
      avatar: '⭐',
      country: userCountry,
      flag: userFlag,
      isHuman: true,
      elo: 1520,
      playStyle: 'Style Universel',
    });

    const worldNames = [
      { name: 'Amadou_DKR', country: 'Sénégal', flag: '🇸🇳', avatar: '🦁', elo: 1680 },
      { name: 'Kouassi_ABJ', country: 'Côte d’Ivoire', flag: '🇨🇮', avatar: '🦅', elo: 1710 },
      { name: 'Camara_CKY', country: 'Guinée', flag: '🇬🇳', avatar: '⚡', elo: 1590 },
      { name: 'Diallo_BKO', country: 'Mali', flag: '🇲🇱', avatar: '👑', elo: 1640 },
      { name: 'Lucas_PARIS', country: 'France', flag: '🇫🇷', avatar: '🎯', elo: 1750 },
      { name: 'Tariq_RAK', country: 'Maroc', flag: '🇲🇦', avatar: '🛡️', elo: 1610 },
      { name: 'Ouedraogo_OUA', country: 'Burkina Faso', flag: '🇧🇫', avatar: '🐎', elo: 1540 },
    ];

    const shuffledWorld = fisherYatesShuffle(worldNames);
    shuffledWorld.forEach((p, idx) => {
      participants.push({
        id: `online_player_${idx + 1}`,
        name: p.name,
        avatar: p.avatar,
        country: p.country,
        flag: p.flag,
        isHuman: true,
        elo: p.elo,
        playStyle: 'Champion En Ligne',
      });
    });
  }

  // Random lottery draw (Tirage au sort 100% aléatoire via Fisher-Yates)
  const seeded = fisherYatesShuffle(participants);
  const matches: TournamentMatch[] = [];

  if (format === 'knockout32') {
    // Round 1: Seizièmes de Finale (16 matches)
    for (let i = 0; i < 16; i++) {
      matches.push({
        id: `${tournamentId}_16f${i + 1}`,
        round: 1,
        roundName: `1/16 de Finale ${i + 1}`,
        matchIndex: i + 1,
        player1Id: seeded[i * 2]?.id || null,
        player2Id: seeded[i * 2 + 1]?.id || null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      });
    }

    // Round 2: Huitièmes de Finale (8 matches)
    for (let i = 0; i < 8; i++) {
      matches.push({
        id: `${tournamentId}_hf${i + 1}`,
        round: 2,
        roundName: `1/8 de Finale ${i + 1}`,
        matchIndex: 17 + i,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      });
    }

    // Round 3: Quarts de Finale (4 matches)
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: `${tournamentId}_qf${i + 1}`,
        round: 3,
        roundName: `1/4 de Finale ${i + 1}`,
        matchIndex: 25 + i,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      });
    }

    // Round 4: Demi-Finales (2 matches)
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `${tournamentId}_sf${i + 1}`,
        round: 4,
        roundName: `Demi-Finale ${i + 1}`,
        matchIndex: 29 + i,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      });
    }

    // Round 5: Grande Finale & 3ème place
    matches.push(
      {
        id: `${tournamentId}_final`,
        round: 5,
        roundName: 'Grande Finale',
        matchIndex: 31,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_bronze`,
        round: 5,
        roundName: 'Match 3ème Place',
        matchIndex: 32,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        isThirdPlace: true,
      }
    );
  } else if (format === 'knockout16') {
    // Round 1: Huitièmes de Finale (8 matches)
    for (let i = 0; i < 8; i++) {
      matches.push({
        id: `${tournamentId}_hf${i + 1}`,
        round: 1,
        roundName: `1/8 de Finale ${i + 1}`,
        matchIndex: i + 1,
        player1Id: seeded[i * 2].id,
        player2Id: seeded[i * 2 + 1].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      });
    }

    // Round 2: Quarts de Finale (4 matches)
    for (let i = 0; i < 4; i++) {
      matches.push({
        id: `${tournamentId}_qf${i + 1}`,
        round: 2,
        roundName: `1/4 de Finale ${i + 1}`,
        matchIndex: 9 + i,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      });
    }

    // Round 3: Demi-Finales (2 matches)
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `${tournamentId}_sf${i + 1}`,
        round: 3,
        roundName: `Demi-Finale ${i + 1}`,
        matchIndex: 13 + i,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      });
    }

    // Round 4: Finale & 3ème place
    matches.push(
      {
        id: `${tournamentId}_final`,
        round: 4,
        roundName: 'Grande Finale',
        matchIndex: 15,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_bronze`,
        round: 4,
        roundName: 'Match 3ème Place',
        matchIndex: 16,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        isThirdPlace: true,
      }
    );
  } else if (format === 'knockout8') {
    // Round 1: Quarts de Finale (4 matches)
    matches.push(
      {
        id: `${tournamentId}_qf1`,
        round: 1,
        roundName: '1/4 de Finale 1',
        matchIndex: 1,
        player1Id: seeded[0].id,
        player2Id: seeded[1].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      },
      {
        id: `${tournamentId}_qf2`,
        round: 1,
        roundName: '1/4 de Finale 2',
        matchIndex: 2,
        player1Id: seeded[2].id,
        player2Id: seeded[3].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      },
      {
        id: `${tournamentId}_qf3`,
        round: 1,
        roundName: '1/4 de Finale 3',
        matchIndex: 3,
        player1Id: seeded[4].id,
        player2Id: seeded[5].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      },
      {
        id: `${tournamentId}_qf4`,
        round: 1,
        roundName: '1/4 de Finale 4',
        matchIndex: 4,
        player1Id: seeded[6].id,
        player2Id: seeded[7].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      }
    );

    // Round 2: Demi-finales (2 matches)
    matches.push(
      {
        id: `${tournamentId}_sf1`,
        round: 2,
        roundName: 'Demi-Finale 1',
        matchIndex: 5,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_sf2`,
        round: 2,
        roundName: 'Demi-Finale 2',
        matchIndex: 6,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      }
    );

    // Round 3: Finale & 3ème place
    matches.push(
      {
        id: `${tournamentId}_final`,
        round: 3,
        roundName: 'Grande Finale',
        matchIndex: 7,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_bronze`,
        round: 3,
        roundName: 'Match 3ème Place',
        matchIndex: 8,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        isThirdPlace: true,
      }
    );
  } else if (format === 'knockout4') {
    // Round 1: Demi-finales (2 matches)
    matches.push(
      {
        id: `${tournamentId}_sf1`,
        round: 1,
        roundName: 'Demi-Finale 1',
        matchIndex: 1,
        player1Id: seeded[0].id,
        player2Id: seeded[1].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      },
      {
        id: `${tournamentId}_sf2`,
        round: 1,
        roundName: 'Demi-Finale 2',
        matchIndex: 2,
        player1Id: seeded[2].id,
        player2Id: seeded[3].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      }
    );

    // Round 2: Finale & 3ème place
    matches.push(
      {
        id: `${tournamentId}_final`,
        round: 2,
        roundName: 'Grande Finale',
        matchIndex: 3,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_bronze`,
        round: 2,
        roundName: 'Match 3ème Place',
        matchIndex: 4,
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        isThirdPlace: true,
      }
    );
  } else {
    // Round-Robin (4 players, 6 matches)
    // Day 1: P0 vs P1, P2 vs P3
    // Day 2: P0 vs P2, P1 vs P3
    // Day 3: P0 vs P3, P1 vs P2
    matches.push(
      {
        id: `${tournamentId}_rr1`,
        round: 1,
        roundName: 'Journée 1',
        matchIndex: 1,
        player1Id: seeded[0].id,
        player2Id: seeded[1].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      },
      {
        id: `${tournamentId}_rr2`,
        round: 1,
        roundName: 'Journée 1',
        matchIndex: 2,
        player1Id: seeded[2].id,
        player2Id: seeded[3].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'ready',
      },
      {
        id: `${tournamentId}_rr3`,
        round: 2,
        roundName: 'Journée 2',
        matchIndex: 3,
        player1Id: seeded[0].id,
        player2Id: seeded[2].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_rr4`,
        round: 2,
        roundName: 'Journée 2',
        matchIndex: 4,
        player1Id: seeded[1].id,
        player2Id: seeded[3].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_rr5`,
        round: 3,
        roundName: 'Journée 3',
        matchIndex: 5,
        player1Id: seeded[0].id,
        player2Id: seeded[3].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      },
      {
        id: `${tournamentId}_rr6`,
        round: 3,
        roundName: 'Journée 3',
        matchIndex: 6,
        player1Id: seeded[1].id,
        player2Id: seeded[2].id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
      }
    );
  }

  const leagueStandings: LeagueStanding[] | undefined =
    format === 'roundRobin'
      ? seeded.map(p => ({
          playerId: p.id,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          points: 0,
          captures: 0,
        }))
      : undefined;

  const state: TournamentState = {
    id: tournamentId,
    name: tournamentName,
    format,
    participants: seeded,
    matches,
    currentRound: 1,
    championId: null,
    runnerUpId: null,
    thirdPlaceId: null,
    activeMatchId: null,
    createdAt: Date.now(),
    status: 'in_progress',
    leagueStandings,
    userParticipantId: mode === 'local' ? seeded[0].id : userParticipantId,
  };

  saveActiveTournament(state);
  return state;
}

// Realistic simulation of AI vs AI match
export function simulateMatch(
  p1: TournamentParticipant,
  p2: TournamentParticipant
): { winnerId: string; score1: number; score2: number } {
  // Elo based win probability
  const eloDiff = p1.elo - p2.elo;
  const prob1 = 1 / (1 + Math.pow(10, -eloDiff / 400));
  const rand = Math.random();

  const p1Wins = rand < prob1;
  const winnerId = p1Wins ? p1.id : p2.id;

  // Realistic piece count scores in 12-pions Kharbga
  const winnerScore = 12;
  const loserScore = Math.floor(Math.random() * 8) + 2; // remaining pieces of loser (or captures)

  return {
    winnerId,
    score1: p1Wins ? winnerScore : loserScore,
    score2: p1Wins ? loserScore : winnerScore,
  };
}

// Advance tournament bracket on match completion
export function applyMatchResult(
  state: TournamentState,
  matchId: string,
  winnerId: string | null,
  score1: number,
  score2: number
): TournamentState {
  const targetMatch = state.matches.find(m => m.id === matchId);
  let effectiveWinnerId = winnerId;
  const isDraw = !effectiveWinnerId || effectiveWinnerId === 'draw';

  // In knockout format, matches MUST be decisive (one advances, one eliminated)
  if (isDraw && state.format !== 'roundRobin' && targetMatch && targetMatch.player1Id && targetMatch.player2Id) {
    if (score1 > score2) {
      effectiveWinnerId = targetMatch.player1Id;
    } else if (score2 > score1) {
      effectiveWinnerId = targetMatch.player2Id;
    } else {
      // Tiebreaker: Elo difference or seeded player
      const p1 = state.participants.find(p => p.id === targetMatch.player1Id);
      const p2 = state.participants.find(p => p.id === targetMatch.player2Id);
      if (p1 && p2 && p2.elo > p1.elo) {
        effectiveWinnerId = p2.id;
      } else {
        effectiveWinnerId = targetMatch.player1Id;
      }
    }
  }

  // In round robin only, a match can truly remain as a draw for league standings
  const finalWinnerId = (state.format === 'roundRobin' && (!effectiveWinnerId || effectiveWinnerId === 'draw'))
    ? null
    : effectiveWinnerId || (targetMatch?.player1Id || null);

  const loserId = targetMatch && finalWinnerId
    ? targetMatch.player1Id === finalWinnerId
      ? targetMatch.player2Id
      : targetMatch.player1Id
    : null;

  // Mark eliminated participant in state.participants
  const updatedParticipants = state.participants.map(p => {
    if (loserId && p.id === loserId) {
      return {
        ...p,
        isEliminated: true,
        eliminatedInRound: targetMatch?.roundName || 'Éliminé',
      };
    }
    if (finalWinnerId && p.id === finalWinnerId) {
      return {
        ...p,
        isEliminated: false,
      };
    }
    return p;
  });

  const updatedMatches = state.matches.map(m => {
    if (m.id !== matchId) return m;
    return {
      ...m,
      winnerId: finalWinnerId,
      score1,
      score2,
      isDraw: !finalWinnerId,
      status: 'completed' as const,
    };
  });

  const nextState: TournamentState = {
    ...state,
    participants: updatedParticipants,
    matches: updatedMatches,
  };

  if (state.format === 'knockout32') {
    // Round 1: 1/16 (matchIndex 1-16) -> Round 2: 1/8 (matchIndex 17-24)
    const m16s = Array.from({ length: 16 }, (_, i) => updatedMatches.find(m => m.matchIndex === i + 1));
    const hfs = Array.from({ length: 8 }, (_, i) => updatedMatches.find(m => m.matchIndex === 17 + i));
    const qfs = Array.from({ length: 4 }, (_, i) => updatedMatches.find(m => m.matchIndex === 25 + i));
    const sfs = Array.from({ length: 2 }, (_, i) => updatedMatches.find(m => m.matchIndex === 29 + i));
    const final = updatedMatches.find(m => m.matchIndex === 31);
    const bronze = updatedMatches.find(m => m.matchIndex === 32);

    // Feed 1/16 to 1/8
    for (let i = 0; i < 8; i++) {
      const hf = hfs[i];
      const p1Match = m16s[i * 2];
      const p2Match = m16s[i * 2 + 1];
      if (hf) {
        if (p1Match?.winnerId) hf.player1Id = p1Match.winnerId;
        if (p2Match?.winnerId) hf.player2Id = p2Match.winnerId;
        if (hf.player1Id && hf.player2Id && hf.status === 'pending') hf.status = 'ready';
      }
    }

    // Feed 1/8 to Quarts
    for (let i = 0; i < 4; i++) {
      const qf = qfs[i];
      const p1Match = hfs[i * 2];
      const p2Match = hfs[i * 2 + 1];
      if (qf) {
        if (p1Match?.winnerId) qf.player1Id = p1Match.winnerId;
        if (p2Match?.winnerId) qf.player2Id = p2Match.winnerId;
        if (qf.player1Id && qf.player2Id && qf.status === 'pending') qf.status = 'ready';
      }
    }

    // Feed Quarts to Demi-Finales
    if (sfs[0]) {
      if (qfs[0]?.winnerId) sfs[0].player1Id = qfs[0].winnerId;
      if (qfs[1]?.winnerId) sfs[0].player2Id = qfs[1].winnerId;
      if (sfs[0].player1Id && sfs[0].player2Id && sfs[0].status === 'pending') sfs[0].status = 'ready';
    }
    if (sfs[1]) {
      if (qfs[2]?.winnerId) sfs[1].player1Id = qfs[2].winnerId;
      if (qfs[3]?.winnerId) sfs[1].player2Id = qfs[3].winnerId;
      if (sfs[1].player1Id && sfs[1].player2Id && sfs[1].status === 'pending') sfs[1].status = 'ready';
    }

    // Feed Demi-Finales to Finale & Bronze
    const allSFsDone = sfs.every(m => m?.status === 'completed');
    if (final && bronze && sfs[0]?.winnerId && sfs[1]?.winnerId && allSFsDone) {
      final.player1Id = sfs[0].winnerId;
      final.player2Id = sfs[1].winnerId;
      if (final.status === 'pending') final.status = 'ready';

      const sf1Loser = sfs[0].player1Id === sfs[0].winnerId ? sfs[0].player2Id : sfs[0].player1Id;
      const sf2Loser = sfs[1].player1Id === sfs[1].winnerId ? sfs[1].player2Id : sfs[1].player1Id;
      bronze.player1Id = sf1Loser;
      bronze.player2Id = sf2Loser;
      if (bronze.status === 'pending') bronze.status = 'ready';
    }

    if (final?.winnerId) {
      nextState.championId = final.winnerId;
      nextState.runnerUpId = final.player1Id === final.winnerId ? final.player2Id : final.player1Id;
      nextState.status = 'completed';
    }
    if (bronze?.winnerId) {
      nextState.thirdPlaceId = bronze.winnerId;
    }

    const m16sDone = m16s.every(m => m?.status === 'completed');
    const hfsDone = hfs.every(m => m?.status === 'completed');
    const qfsDone = qfs.every(m => m?.status === 'completed');
    if (nextState.status !== 'completed') {
      if (allSFsDone) {
        nextState.currentRound = 5;
      } else if (qfsDone) {
        nextState.currentRound = 4;
      } else if (hfsDone) {
        nextState.currentRound = 3;
      } else if (m16sDone) {
        nextState.currentRound = 2;
      }
    }
  } else if (state.format === 'knockout16') {
    // Round 1: 1/8 (matchIndex 1-8) -> Round 2: 1/4 (matchIndex 9-12)
    const hfs = [1, 2, 3, 4, 5, 6, 7, 8].map(i => updatedMatches.find(m => m.matchIndex === i));
    const qfs = [9, 10, 11, 12].map(i => updatedMatches.find(m => m.matchIndex === i));
    const sfs = [13, 14].map(i => updatedMatches.find(m => m.matchIndex === i));
    const final = updatedMatches.find(m => m.matchIndex === 15);
    const bronze = updatedMatches.find(m => m.matchIndex === 16);

    // Feed HFs to QFs
    if (qfs[0]) {
      if (hfs[0]?.winnerId) qfs[0].player1Id = hfs[0].winnerId;
      if (hfs[1]?.winnerId) qfs[0].player2Id = hfs[1].winnerId;
      if (qfs[0].player1Id && qfs[0].player2Id && qfs[0].status === 'pending') qfs[0].status = 'ready';
    }
    if (qfs[1]) {
      if (hfs[2]?.winnerId) qfs[1].player1Id = hfs[2].winnerId;
      if (hfs[3]?.winnerId) qfs[1].player2Id = hfs[3].winnerId;
      if (qfs[1].player1Id && qfs[1].player2Id && qfs[1].status === 'pending') qfs[1].status = 'ready';
    }
    if (qfs[2]) {
      if (hfs[4]?.winnerId) qfs[2].player1Id = hfs[4].winnerId;
      if (hfs[5]?.winnerId) qfs[2].player2Id = hfs[5].winnerId;
      if (qfs[2].player1Id && qfs[2].player2Id && qfs[2].status === 'pending') qfs[2].status = 'ready';
    }
    if (qfs[3]) {
      if (hfs[6]?.winnerId) qfs[3].player1Id = hfs[6].winnerId;
      if (hfs[7]?.winnerId) qfs[3].player2Id = hfs[7].winnerId;
      if (qfs[3].player1Id && qfs[3].player2Id && qfs[3].status === 'pending') qfs[3].status = 'ready';
    }

    // Feed QFs to SFs
    if (sfs[0]) {
      if (qfs[0]?.winnerId) sfs[0].player1Id = qfs[0].winnerId;
      if (qfs[1]?.winnerId) sfs[0].player2Id = qfs[1].winnerId;
      if (sfs[0].player1Id && sfs[0].player2Id && sfs[0].status === 'pending') sfs[0].status = 'ready';
    }
    if (sfs[1]) {
      if (qfs[2]?.winnerId) sfs[1].player1Id = qfs[2].winnerId;
      if (qfs[3]?.winnerId) sfs[1].player2Id = qfs[3].winnerId;
      if (sfs[1].player1Id && sfs[1].player2Id && sfs[1].status === 'pending') sfs[1].status = 'ready';
    }

    // Feed SFs to Final and Bronze
    const allSFsDone = sfs.every(m => m?.status === 'completed');
    if (final && bronze && sfs[0]?.winnerId && sfs[1]?.winnerId && allSFsDone) {
      final.player1Id = sfs[0].winnerId;
      final.player2Id = sfs[1].winnerId;
      if (final.status === 'pending') final.status = 'ready';

      const sf1Loser = sfs[0].player1Id === sfs[0].winnerId ? sfs[0].player2Id : sfs[0].player1Id;
      const sf2Loser = sfs[1].player1Id === sfs[1].winnerId ? sfs[1].player2Id : sfs[1].player1Id;
      bronze.player1Id = sf1Loser;
      bronze.player2Id = sf2Loser;
      if (bronze.status === 'pending') bronze.status = 'ready';
    }

    if (final?.winnerId) {
      nextState.championId = final.winnerId;
      nextState.runnerUpId = final.player1Id === final.winnerId ? final.player2Id : final.player1Id;
      nextState.status = 'completed';
    }
    if (bronze?.winnerId) {
      nextState.thirdPlaceId = bronze.winnerId;
    }

    const hfsDone = hfs.every(m => m?.status === 'completed');
    const qfsDone = qfs.every(m => m?.status === 'completed');
    if (nextState.status !== 'completed') {
      if (allSFsDone) {
        nextState.currentRound = 4;
      } else if (qfsDone) {
        nextState.currentRound = 3;
      } else if (hfsDone) {
        nextState.currentRound = 2;
      }
    }
  } else if (state.format === 'knockout8') {
    // QF1 & QF2 feed into SF1
    const qf1 = updatedMatches.find(m => m.matchIndex === 1);
    const qf2 = updatedMatches.find(m => m.matchIndex === 2);
    // QF3 & QF4 feed into SF2
    const qf3 = updatedMatches.find(m => m.matchIndex === 3);
    const qf4 = updatedMatches.find(m => m.matchIndex === 4);

    const sf1 = updatedMatches.find(m => m.matchIndex === 5);
    const sf2 = updatedMatches.find(m => m.matchIndex === 6);
    const final = updatedMatches.find(m => m.matchIndex === 7);
    const bronze = updatedMatches.find(m => m.matchIndex === 8);

    if (sf1) {
      if (qf1?.winnerId) sf1.player1Id = qf1.winnerId;
      if (qf2?.winnerId) sf1.player2Id = qf2.winnerId;
      if (sf1.player1Id && sf1.player2Id && sf1.status === 'pending') {
        sf1.status = 'ready';
      }
    }

    if (sf2) {
      if (qf3?.winnerId) sf2.player1Id = qf3.winnerId;
      if (qf4?.winnerId) sf2.player2Id = qf4.winnerId;
      if (sf2.player1Id && sf2.player2Id && sf2.status === 'pending') {
        sf2.status = 'ready';
      }
    }

    const allSFsDone = [sf1, sf2].every(m => m?.status === 'completed');

    if (final && bronze && sf1?.winnerId && sf2?.winnerId && allSFsDone) {
      final.player1Id = sf1.winnerId;
      final.player2Id = sf2.winnerId;
      if (final.status === 'pending') final.status = 'ready';

      const sf1Loser = sf1.player1Id === sf1.winnerId ? sf1.player2Id : sf1.player1Id;
      const sf2Loser = sf2.player1Id === sf2.winnerId ? sf2.player2Id : sf2.player1Id;
      bronze.player1Id = sf1Loser;
      bronze.player2Id = sf2Loser;
      if (bronze.status === 'pending') bronze.status = 'ready';
    }

    if (final?.winnerId) {
      nextState.championId = final.winnerId;
      nextState.runnerUpId = final.player1Id === final.winnerId ? final.player2Id : final.player1Id;
      nextState.status = 'completed';
    }
    if (bronze?.winnerId) {
      nextState.thirdPlaceId = bronze.winnerId;
    }

    // Advance current round indicator
    const qfsDone = [qf1, qf2, qf3, qf4].every(m => m?.status === 'completed');
    if (nextState.status !== 'completed') {
      if (allSFsDone) {
        nextState.currentRound = 3;
      } else if (qfsDone) {
        nextState.currentRound = 2;
      }
    }
  } else if (state.format === 'knockout4') {
    const sf1 = updatedMatches.find(m => m.matchIndex === 1);
    const sf2 = updatedMatches.find(m => m.matchIndex === 2);
    const final = updatedMatches.find(m => m.matchIndex === 3);
    const bronze = updatedMatches.find(m => m.matchIndex === 4);

    if (final && bronze && sf1?.winnerId && sf2?.winnerId) {
      final.player1Id = sf1.winnerId;
      final.player2Id = sf2.winnerId;
      if (final.status === 'pending') final.status = 'ready';

      const sf1Loser = sf1.player1Id === sf1.winnerId ? sf1.player2Id : sf1.player1Id;
      const sf2Loser = sf2.player1Id === sf2.winnerId ? sf2.player2Id : sf2.player1Id;
      bronze.player1Id = sf1Loser;
      bronze.player2Id = sf2Loser;
      if (bronze.status === 'pending') bronze.status = 'ready';
    }

    if (final?.winnerId) {
      nextState.championId = final.winnerId;
      nextState.runnerUpId = final.player1Id === final.winnerId ? final.player2Id : final.player1Id;
      nextState.status = 'completed';
    }
    if (bronze?.winnerId) {
      nextState.thirdPlaceId = bronze.winnerId;
    }
  } else if (state.format === 'roundRobin') {
    // Update league standings
    const currentStandings = [...(state.leagueStandings || [])];
    const match = updatedMatches.find(m => m.id === matchId);
    if (match && match.player1Id && match.player2Id) {
      const s1 = currentStandings.find(s => s.playerId === match.player1Id);
      const s2 = currentStandings.find(s => s.playerId === match.player2Id);

      if (s1 && s2) {
        s1.played += 1;
        s2.played += 1;
        s1.captures += score1;
        s2.captures += score2;

        if (finalWinnerId === s1.playerId) {
          s1.won += 1;
          s1.points += 3;
          s2.lost += 1;
        } else if (finalWinnerId === s2.playerId) {
          s2.won += 1;
          s2.points += 3;
          s1.lost += 1;
        } else {
          // Draw
          s1.drawn += 1;
          s2.drawn += 1;
          s1.points += 1;
          s2.points += 1;
        }
      }
    }

    // Sort standings by points DESC, then captures DESC
    currentStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.captures - a.captures;
    });
    nextState.leagueStandings = currentStandings;

    // Unlock next round matches if current round is finished
    const r1Done = updatedMatches.filter(m => m.round === 1).every(m => m.status === 'completed');
    const r2Done = updatedMatches.filter(m => m.round === 2).every(m => m.status === 'completed');
    const r3Done = updatedMatches.filter(m => m.round === 3).every(m => m.status === 'completed');

    if (r1Done) {
      updatedMatches
        .filter(m => m.round === 2 && m.status === 'pending')
        .forEach(m => (m.status = 'ready'));
    }
    if (r2Done) {
      updatedMatches
        .filter(m => m.round === 3 && m.status === 'pending')
        .forEach(m => (m.status = 'ready'));
    }

    if (r3Done) {
      nextState.status = 'completed';
      if (currentStandings[0]) nextState.championId = currentStandings[0].playerId;
      if (currentStandings[1]) nextState.runnerUpId = currentStandings[1].playerId;
      if (currentStandings[2]) nextState.thirdPlaceId = currentStandings[2].playerId;
    }
  }

  // If completed, record to history
  if (nextState.status === 'completed' && nextState.championId) {
    const champ = nextState.participants.find(p => p.id === nextState.championId);
    const userPart = nextState.participants.find(p => p.id === nextState.userParticipantId);
    const userWon = nextState.championId === nextState.userParticipantId;

    let rank = 4;
    if (userWon) rank = 1;
    else if (nextState.runnerUpId === nextState.userParticipantId) rank = 2;
    else if (nextState.thirdPlaceId === nextState.userParticipantId) rank = 3;

    saveTournamentHistory({
      id: nextState.id,
      name: nextState.name,
      format: nextState.format,
      date: Date.now(),
      rank,
      championName: champ?.name || 'Inconnu',
      userName: userPart?.name || 'Vous',
      won: userWon,
    });
  }

  saveActiveTournament(nextState);
  return nextState;
}

// Helper to find the next ready match to play in the bracket
export function getNextReadyMatch(state: TournamentState): {
  match: TournamentMatch;
  p1: TournamentParticipant;
  p2: TournamentParticipant;
} | null {
  if (state.status === 'completed') return null;

  // 1. Check if user has an active ready match
  const userMatch = state.matches.find(
    m =>
      m.status === 'ready' &&
      m.player1Id &&
      m.player2Id &&
      (m.player1Id === state.userParticipantId || m.player2Id === state.userParticipantId)
  );

  // 2. Otherwise pick the earliest ready match in current round
  const targetMatch =
    userMatch ||
    state.matches.find(m => m.status === 'ready' && m.player1Id && m.player2Id);

  if (!targetMatch || !targetMatch.player1Id || !targetMatch.player2Id) return null;

  const p1 = state.participants.find(p => p.id === targetMatch.player1Id);
  const p2 = state.participants.find(p => p.id === targetMatch.player2Id);

  if (!p1 || !p2) return null;
  return { match: targetMatch, p1, p2 };
}

// Automatically advance all ready AI vs AI matches in current phase
export function advanceRoundAiMatches(state: TournamentState): TournamentState {
  if (state.status === 'completed') return state;

  let current = { ...state };
  let simulatedAny = true;
  let loops = 0;

  while (simulatedAny && loops < 32 && current.status !== 'completed') {
    simulatedAny = false;
    loops++;

    // Find any match that is 'ready' and both participants are non-human
    const readyBotMatch = current.matches.find(m => {
      if (m.status !== 'ready' || m.winnerId !== null || !m.player1Id || !m.player2Id) return false;
      const p1 = current.participants.find(p => p.id === m.player1Id);
      const p2 = current.participants.find(p => p.id === m.player2Id);
      return p1 && p2 && !p1.isHuman && !p2.isHuman;
    });

    if (readyBotMatch && readyBotMatch.player1Id && readyBotMatch.player2Id) {
      const p1 = current.participants.find(p => p.id === readyBotMatch.player1Id);
      const p2 = current.participants.find(p => p.id === readyBotMatch.player2Id);
      if (p1 && p2) {
        const sim = simulateMatch(p1, p2);
        current = applyMatchResult(current, readyBotMatch.id, sim.winnerId, sim.score1, sim.score2);
        simulatedAny = true;
      }
    }
  }

  return current;
}

// Fast simulate all remaining matches until the tournament is completed
export function simulateRemainingTournament(state: TournamentState): TournamentState {
  if (state.status === 'completed') return state;

  let current = { ...state };
  let loops = 0;

  while (current.status !== 'completed' && loops < 50) {
    loops++;
    const readyMatch = current.matches.find(
      m => m.status === 'ready' && m.winnerId === null && m.player1Id && m.player2Id
    );
    if (!readyMatch || !readyMatch.player1Id || !readyMatch.player2Id) break;

    const p1 = current.participants.find(p => p.id === readyMatch.player1Id);
    const p2 = current.participants.find(p => p.id === readyMatch.player2Id);
    if (!p1 || !p2) break;

    const sim = simulateMatch(p1, p2);
    current = applyMatchResult(current, readyMatch.id, sim.winnerId, sim.score1, sim.score2);
  }

  return current;
}
