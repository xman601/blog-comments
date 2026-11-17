// Run with: node --test scripts/moderate.test.js
// Requires: pip install -r requirements.txt (the profanity check shells out to Python).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const moderate = require('./moderate.js');
const { analyze, decide } = moderate;

const ALLOWED = ['github.com', 'stackoverflow.com', 'xej.me'];
const verdict = (body) => decide({ body, profane: false, allowedDomains: ALLOWED });

// ---------------------------------------------------------------- filters

test('short, normal comments pass', () => {
  for (const body of ['Great post', 'Thanks!', 'Nice', '👍']) assert.equal(verdict(body), null, body);
});

test('mentioning image file names is not an image', () => {
  assert.equal(verdict('I changed favicon.svg to a png and it worked'), null);
  assert.equal(verdict('My config.jpg export was broken'), null);
});

test('embedded images are hidden', () => {
  assert.match(verdict('look ![x](https://github.com/a.png)').reason, /images/);
  assert.match(verdict('<img src="https://github.com/a.png">').reason, /images/);
  assert.match(verdict('![x][ref]\n\n[ref]: https://github.com/a.png').reason, /images/);
});

test('links: allowlisted hosts and subdomains pass, others are hidden', () => {
  assert.equal(verdict('See https://github.com/xman601/Blog/issues/1'), null);
  assert.equal(verdict('Gist: https://gist.github.com/abc'), null);
  assert.equal(verdict('Answer: https://stackoverflow.com/q/1'), null);
  assert.match(verdict('Visit https://cheap-deals.example now').reason, /links not allowed \(cheap-deals\.example\)/);
  assert.match(verdict('https://github.com.evil.example/x').reason, /links not allowed/);
  assert.match(verdict('https://free.tk').reason, /links not allowed/);
});

test('links and caps inside code are ignored', () => {
  assert.equal(verdict('Run `curl https://random.example/install.sh`'), null);
  assert.equal(verdict('```\nexport API_URL=https://random.example\nconst MAX_RETRIES_ALLOWED = 10\n```'), null);
});

test('spam heuristics', () => {
  assert.match(verdict('aaaaaaaaaaaaaa').reason, /repeated characters/);
  assert.match(verdict('a a a a a a a').reason, /spaced repeated/);
  assert.match(verdict('a-a-a-a-a-a-a').reason, /spaced repeated/);
  assert.match(verdict('THIS IS THE BEST BLOG POST EVER WRITTEN').reason, /excessive caps/);
  assert.match(verdict('Make money online with this one trick').reason, /spam phrase/);
  assert.match(verdict('😀'.repeat(11)).reason, /emojis/);
});

test('normal prose is not spam', () => {
  for (const body of [
    'Setext heading\n==========\n\nworks fine',
    'I used the NAS with SSL and HTTPS on my LAN.',
    'This is urgent for me, click here in the UI to open settings.',
    'Hmmm, interesting...',
  ]) assert.equal(verdict(body), null, body);
});

test('profanity wins over everything else', () => {
  assert.deepEqual(decide({ body: 'x', profane: true, allowedDomains: [] }), {
    reason: 'offensive language',
    classifier: 'ABUSE',
  });
});

// ---------------------------------------------------------------- end to end

function fakeEnv(commentOverrides = {}) {
  const calls = { graphql: [], issueComments: [], issuesCreated: [] };
  const github = {
    graphql: async (query, vars) => calls.graphql.push({ query, vars }),
    rest: {
      issues: {
        listForRepo: async () => ({ data: [] }),
        create: async (args) => (calls.issuesCreated.push(args), { data: { number: 7 } }),
        createComment: async (args) => calls.issueComments.push(args),
      },
    },
  };
  const summary = { addHeading: () => summary, addRaw: () => summary, write: async () => {} };
  const core = { info() {}, notice() {}, warning() {}, summary };
  const context = {
    repo: { owner: 'xman601', repo: 'blog-comments' },
    payload: {
      comment: {
        body: 'Great post',
        node_id: 'DC_abc',
        html_url: 'https://github.com/xman601/blog-comments/discussions/1#discussioncomment-1',
        author_association: 'NONE',
        user: { login: 'Some-User', type: 'User' },
        ...commentOverrides,
      },
    },
  };
  return { github, core, context, calls };
}

test('shell injection payload is inert', async () => {
  const marker = path.join(os.tmpdir(), `moderate-injection-${process.pid}`);
  const env = fakeEnv({ body: `nice post\\"; touch ${marker}; echo \\"` });
  await moderate(env);
  assert.equal(fs.existsSync(marker), false, 'injected command must not run');
});

test('clean comment is left alone', async () => {
  const env = fakeEnv();
  await moderate(env);
  assert.equal(env.calls.graphql.length, 0);
});

test('profane comment is hidden as ABUSE and logged without pinging the author', async () => {
  const env = fakeEnv({ body: 'this is bullshit' });
  await moderate(env);
  assert.equal(env.calls.graphql.length, 1);
  assert.deepEqual(env.calls.graphql[0].vars, { id: 'DC_abc', classifier: 'ABUSE' });
  assert.equal(env.calls.issuesCreated[0].labels[0], 'moderation-log');
  const log = env.calls.issueComments[0].body;
  assert.match(log, /`Some-User`/);
  assert.doesNotMatch(log, /@Some-User/);
  assert.doesNotMatch(log, /bullshit/, 'log must not repeat the comment text');
});

test('owner, collaborators, bots, and trusted users are skipped', async () => {
  for (const overrides of [
    { author_association: 'OWNER', body: 'https://random.example' },
    { author_association: 'COLLABORATOR', body: 'https://random.example' },
    { user: { login: 'giscus[bot]', type: 'Bot' }, body: 'https://random.example' },
    { user: { login: 'xman601', type: 'User' }, body: 'https://random.example' },
  ]) {
    const env = fakeEnv(overrides);
    await moderate(env);
    assert.equal(env.calls.graphql.length, 0, JSON.stringify(overrides));
  }
});

test('missing comment payload is a no-op', async () => {
  const env = fakeEnv();
  env.context.payload = { discussion: {} };
  await moderate(env);
  assert.equal(env.calls.graphql.length, 0);
});
