import { avatarFor } from './avatar';
import type { AdminServiceSettings, Article, Comment, Profile, User } from './models';

const profile = (username: string, bio: string, following: boolean): Profile => ({
  username,
  bio,
  image: avatarFor(username),
  following,
});

export const JAKE: Profile = profile('jake', 'I work at statefarm', false);
export const ANAH: Profile = profile('anah.hane', 'Systems engineer. Writes about resilience.', true);
export const MAYA: Profile = profile('maya.oren', 'Design systems, typography, and slow software.', false);
export const RILEY: Profile = profile('riley.k', 'Backend nerd. Postgres apologist.', true);

export const DEMO_USER: User = {
  email: 'jake@demo',
  token: 'preview-session-token',
  username: 'jake',
  bio: 'I work at statefarm',
  image: avatarFor('jake'),
  role: 'ADMIN',
};

const article = (
  slug: string,
  title: string,
  description: string,
  body: string,
  tagList: string[],
  author: Profile,
  createdAt: string,
  favorited: boolean,
  favoritesCount: number,
): Article => ({
  slug,
  title,
  description,
  body,
  tagList,
  createdAt,
  updatedAt: createdAt,
  favorited,
  favoritesCount,
  author,
});

export const MOCK_ARTICLES: Article[] = [
  article(
    'how-to-train-your-dragon-a1b2c3',
    'How to train your dragon',
    'Ever wonder how?',
    'It takes a Jacobian.\n\nDragons respond to consistency far more than to force. Start with a short daily session, keep the reward immediate, and never end on a failure. The first week is entirely about trust; the flying comes later and it comes quickly once the trust is there.\n\nThe most common mistake is escalating too fast. A dragon that has learned to expect pressure will brace against it, and a braced dragon cannot be taught anything.',
    ['dragons', 'training'],
    JAKE,
    '2026-08-28T09:12:00.000Z',
    false,
    31,
  ),
  article(
    'the-quiet-case-for-boring-databases-7f21aa',
    'The quiet case for boring databases',
    'Postgres has been the right answer for eleven years running.',
    'Every few years a new datastore promises to remove a constraint you were not actually blocked by.\n\nMeanwhile the boring database keeps shipping: better planner statistics, logical replication, and a query language your whole team already reads. The exciting choice costs you a year of operational learning; the boring one costs you an afternoon of index tuning.',
    ['postgres', 'architecture'],
    RILEY,
    '2026-08-26T14:02:00.000Z',
    true,
    112,
  ),
  article(
    'designing-for-the-second-read-3d9e10',
    'Designing for the second read',
    'Most interfaces are optimised for people who have never seen them.',
    'First-run experience gets all the attention, but the person who opens your product for the four-hundredth time is the one paying you.\n\nDesign the second read: stable layouts, predictable keyboard paths, and no animation that costs you a beat of attention you have already earned.',
    ['design', 'craft'],
    MAYA,
    '2026-08-24T08:45:00.000Z',
    false,
    64,
  ),
  article(
    'resilience-is-a-budget-not-a-feature-90cc4d',
    'Resilience is a budget, not a feature',
    'You cannot add reliability at the end of the quarter.',
    'Availability is spent, not bought. Every retry, every timeout, every fallback path is drawn from a fixed budget of complexity your team can actually hold in its head.\n\nWrite the budget down. Decide which failures you will absorb and which you will surface honestly to the user, and then stop adding machinery.',
    ['reliability', 'architecture'],
    ANAH,
    '2026-08-21T17:30:00.000Z',
    true,
    88,
  ),
  article(
    'notes-on-writing-in-public-5be0f2',
    'Notes on writing in public',
    'The draft you are embarrassed by is the one worth publishing.',
    'Publishing early is not about bravery, it is about shortening the feedback loop between what you believe and what is true.\n\nKeep the post short enough that you would still publish it on a bad day.',
    ['writing', 'craft'],
    MAYA,
    '2026-08-19T11:05:00.000Z',
    false,
    27,
  ),
  article(
    'dragons-do-not-scale-horizontally-c4d5e6',
    'Dragons do not scale horizontally',
    'A field report from year two.',
    'You cannot solve a dragon problem by adding a second dragon. The coordination overhead is, in the technical sense, enormous.\n\nWhat does work: one dragon, a very clear contract, and a fireproof shed.',
    ['dragons', 'reliability'],
    JAKE,
    '2026-08-15T07:20:00.000Z',
    true,
    45,
  ),
  article(
    'the-index-you-forgot-to-add-11ff09',
    'The index you forgot to add',
    'A short story about a sequential scan.',
    'It was fine at ten thousand rows. It was fine at a hundred thousand. At four million it took the whole checkout flow down on a Friday.\n\nAdd the index. Add it now.',
    ['postgres', 'performance'],
    RILEY,
    '2026-08-11T19:48:00.000Z',
    false,
    73,
  ),
  article(
    'typography-for-people-in-a-hurry-8ab33c',
    'Typography for people in a hurry',
    'Three decisions carry ninety percent of the result.',
    'Pick one family. Set a measure between sixty and seventy-five characters. Give the body copy a line height it can breathe in.\n\nEverything after that is refinement, and refinement is optional.',
    ['design', 'typography'],
    MAYA,
    '2026-08-06T10:15:00.000Z',
    false,
    39,
  ),
  article(
    'what-a-good-postmortem-sounds-like-6e7f80',
    'What a good postmortem sounds like',
    'Curious, specific, and completely free of blame.',
    'A good postmortem reads like a nature documentary about your own system: here is what it did, here is why it made sense at the time, here is the condition that made it inevitable.\n\nIf a name appears more than once, rewrite it.',
    ['reliability', 'teams'],
    ANAH,
    '2026-08-02T13:00:00.000Z',
    true,
    96,
  ),
  article(
    'small-tools-long-lifetimes-2c9b41',
    'Small tools, long lifetimes',
    'The scripts that outlive the platform.',
    'The tool that survives is never the ambitious one. It is the ninety-line script with no dependencies that one person maintains out of affection.\n\nWrite more of those.',
    ['craft', 'tooling'],
    RILEY,
    '2026-07-29T16:40:00.000Z',
    false,
    52,
  ),
  article(
    'reading-the-flight-log-af0021',
    'Reading the flight log',
    'What two hundred hours of telemetry taught us.',
    'Telemetry is a diary written by a system that cannot lie but also cannot explain itself. The value is entirely in the questions you bring to it.\n\nStart with: what changed, and when did it stop being true?',
    ['dragons', 'reliability'],
    JAKE,
    '2026-07-22T09:00:00.000Z',
    false,
    18,
  ),
  article(
    'against-the-infinite-backlog-73de55',
    'Against the infinite backlog',
    'A backlog is a promise you never intended to keep.',
    'If an item has been in the queue for a year, it is not a task. It is a feeling that somebody once had about the product.\n\nDelete it. If it matters, it will come back on its own.',
    ['teams', 'craft'],
    ANAH,
    '2026-07-18T12:25:00.000Z',
    false,
    41,
  ),
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 1,
    createdAt: '2026-08-28T12:40:00.000Z',
    updatedAt: '2026-08-28T12:40:00.000Z',
    body: 'The bit about never ending on a failure matches everything I have seen. Good writeup.',
    author: ANAH,
  },
  {
    id: 2,
    createdAt: '2026-08-29T08:05:00.000Z',
    updatedAt: '2026-08-29T08:05:00.000Z',
    body: 'Curious how much of this transfers to smaller species. The trust window seems much shorter there.',
    author: MAYA,
  },
  {
    id: 3,
    createdAt: '2026-08-30T15:22:00.000Z',
    updatedAt: '2026-08-30T15:22:00.000Z',
    body: 'Week one being pure trust-building is the part everyone skips.',
    author: JAKE,
  },
];

export const MOCK_TAGS: string[] = [
  'dragons',
  'reliability',
  'architecture',
  'craft',
  'design',
  'postgres',
  'training',
  'writing',
  'typography',
  'performance',
  'teams',
  'tooling',
];

export const MOCK_ADMIN_SETTINGS: AdminServiceSettings[] = [
  {
    service: 'postgresql',
    label: 'PostgreSQL',
    description: 'Primary datastore for users, articles, comments and tags.',
    configured: true,
    keys: [
      { key: 'DATABASE_URL', value: 'postgresql://conduit:••••••••@app-db:5432/conduit', configured: true },
    ],
  },
  {
    service: 'minio',
    label: 'MinIO object storage',
    description: 'Object storage for future article and avatar uploads.',
    configured: false,
    keys: [
      { key: 'MINIO_ENDPOINT', value: '', configured: false },
      { key: 'MINIO_ACCESS_KEY', value: '', configured: false },
      { key: 'MINIO_SECRET_KEY', value: '', configured: false },
      { key: 'MINIO_BUCKET', value: '', configured: false },
    ],
  },
];
