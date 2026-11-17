// Comment moderation for giscus-backed GitHub Discussions.
//
// Called from .github/workflows/moderate-comments.yml via actions/github-script:
//   await require('./scripts/moderate.js')({ github, context, core });
//
// Pure helpers are exported for the tests in scripts/moderate.test.js.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LOG_ISSUE_TITLE = 'Moderation log';
const LOG_LABEL = 'moderation-log';

// ---------------------------------------------------------------- lists

function readList(relPath) {
  let raw = '';
  try {
    raw = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  } catch (error) {
    console.log(`⚠️ Could not read ${relPath}: ${error.message}`);
  }
  return raw
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#'));
}

// ---------------------------------------------------------------- analysis

// Remove fenced and inline code so that URLs, CONSTANTS, repeated characters,
// and file names inside code samples don't trip the spam/link checks.
function stripCode(text) {
  return text
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/~~~[\s\S]*?(~~~|$)/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isAllowedHost(host, allowedDomains) {
  return allowedDomains.some((d) => host === d || host.endsWith(`.${d}`));
}

const SUSPICIOUS_TLDS = /\.(tk|ml|ga|cf|gq|click|link|xyz|top|buzz|rest|cam)$/i;

const SPAM_PHRASES = [
  /\bbuy now\b/i,
  /\bfree money\b/i,
  /\bmake money (fast|online|from home)\b/i,
  /\bwork from home\b/i,
  /\bearn \$?\d[\d,]*\+? (per|a|every) (day|week|hour)\b/i,
  /\b(crypto|forex|bitcoin) (signals?|investment|profits?)\b/i,
  /\b(dm|message|contact) me on (whatsapp|telegram)\b/i,
];

const IMAGE_PATTERNS = [
  /!\[[^\]]*\]\([^)]*\)/, // ![alt](url)
  /!\[[^\]]*\]\s*\[[^\]]*\]/, // ![alt][ref]
  /<img\b[^>]*>/i, // <img ...>
  /<picture\b/i,
];

const EMOJI = /\p{Extended_Pictographic}/gu;

function analyze(body, { allowedDomains = [] } = {}) {
  const prose = stripCode(body);

  // Links: blocked unless the host is on the allowlist. Suspicious TLDs are
  // always blocked, even if someone allowlists a parent domain by mistake.
  const urls = prose.match(/https?:\/\/[^\s<>()"'\]]+/gi) || [];
  const badLinks = urls.filter((url) => {
    const host = hostOf(url);
    if (!host) return true;
    if (SUSPICIOUS_TLDS.test(host)) return true;
    return !isAllowedHost(host, allowedDomains);
  });

  // Images: only actual embeds, not file names mentioned in text.
  const hasImages = IMAGE_PATTERNS.some((p) => p.test(prose));

  // Spam heuristics (run on the original case; code removed).
  const letters = prose.replace(/[^a-z]/gi, '');
  const upper = prose.replace(/[^A-Z]/g, '');
  const spamReasons = [];
  if (SPAM_PHRASES.some((p) => p.test(prose))) spamReasons.push('spam phrase');
  if (/([\p{L}\p{N}])\1{9,}/u.test(prose)) spamReasons.push('repeated characters');
  if (/([\p{L}\p{N}])(?:[\s._-]+\1){5,}/u.test(prose)) spamReasons.push('spaced repeated characters');
  if (letters.length >= 20 && upper.length / letters.length > 0.7) spamReasons.push('excessive caps');
  const emojiCount = (prose.match(EMOJI) || []).length;
  if (emojiCount > 10) spamReasons.push(`${emojiCount} emojis`);

  return { badLinks, hasImages, spamReasons };
}

// ---------------------------------------------------------------- profanity

function checkProfanity(text) {
  try {
    execFileSync('python3', [path.join(__dirname, 'check_profanity.py')], {
      input: text,
      encoding: 'utf-8',
      env: process.env,
    });
    return false;
  } catch (error) {
    if (error.status === 1) return true;
    // Anything else is a real failure: surface it instead of hiding the comment.
    throw new Error(`Profanity checker failed (exit ${error.status}): ${error.stdout || error.message}`);
  }
}

// ---------------------------------------------------------------- decision

function decide({ body, profane, allowedDomains }) {
  if (profane) return { reason: 'offensive language', classifier: 'ABUSE' };
  const { badLinks, hasImages, spamReasons } = analyze(body, { allowedDomains });
  if (badLinks.length) {
    const hosts = [...new Set(badLinks.map((u) => hostOf(u) || 'invalid URL'))];
    return { reason: `links not allowed (${hosts.join(', ')})`, classifier: 'SPAM' };
  }
  if (hasImages) return { reason: 'images not allowed', classifier: 'SPAM' };
  if (spamReasons.length) return { reason: `spam (${spamReasons.join(', ')})`, classifier: 'SPAM' };
  return null;
}

// ---------------------------------------------------------------- GitHub I/O

async function hideComment(github, subjectId, classifier) {
  await github.graphql(
    `mutation($id: ID!, $classifier: ReportedContentClassifiers!) {
       minimizeComment(input: { subjectId: $id, classifier: $classifier }) {
         minimizedComment { isMinimized }
       }
     }`,
    { id: subjectId, classifier },
  );
}

// Append an entry to a single "Moderation log" issue so hidden comments
// show up in your GitHub notifications and false positives can be reviewed.
// The log records who/why/where, never the comment text itself.
async function logToIssue(github, context, line) {
  const { owner, repo } = context.repo;
  const { data: found } = await github.rest.issues.listForRepo({
    owner,
    repo,
    labels: LOG_LABEL,
    state: 'all',
    per_page: 1,
  });
  let issue = found[0];
  if (!issue) {
    ({ data: issue } = await github.rest.issues.create({
      owner,
      repo,
      title: LOG_ISSUE_TITLE,
      labels: [LOG_LABEL],
      body: 'Automatic log of comments hidden by the moderation workflow. ' +
        'To restore a false positive, open the link and choose **Unhide**.',
    }));
  }
  await github.rest.issues.createComment({ owner, repo, issue_number: issue.number, body: line });
}

// ---------------------------------------------------------------- entry point

module.exports = async function moderate({ github, context, core }) {
  const comment = context.payload.comment;
  if (!comment) {
    core.info('No comment in payload; nothing to moderate.');
    return;
  }

  const author = comment.user.login.toLowerCase();
  core.info(`🔍 Moderating comment ${comment.html_url} from @${author}`);

  if (comment.user.type === 'Bot') {
    core.info('🤖 Bot author. Skipping.');
    return;
  }
  if (['OWNER', 'MEMBER', 'COLLABORATOR'].includes(comment.author_association)) {
    core.info(`✅ @${author} is a repository ${comment.author_association.toLowerCase()}. Skipping.`);
    return;
  }

  const trustedUsers = readList('.banned/trusted-users.txt');
  const blockedUsers = readList('.banned/blocked-users.txt');
  const allowedDomains = readList('.banned/allowed-domains.txt');

  if (trustedUsers.includes(author)) {
    core.info(`✅ @${author} is trusted. Skipping.`);
    return;
  }

  let verdict;
  if (blockedUsers.includes(author)) {
    verdict = { reason: 'blocked user', classifier: 'SPAM' };
  } else {
    verdict = decide({ body: comment.body, profane: checkProfanity(comment.body), allowedDomains });
  }

  if (!verdict) {
    core.info(`✅ Comment from @${author} passed all filters.`);
    return;
  }

  core.info(`🚫 Hiding comment: ${verdict.reason}`);
  await hideComment(github, comment.node_id, verdict.classifier);

  // Login in backticks, without @, so the log doesn't notify the commenter.
  const line = `Hid comment by \`${comment.user.login}\` — **${verdict.reason}** — ${comment.html_url}`;
  core.notice(line);
  await core.summary.addHeading('Comment hidden', 3).addRaw(line).write();

  try {
    await logToIssue(github, context, line);
  } catch (error) {
    core.warning(`Could not write to the moderation log issue: ${error.message}`);
  }
};

module.exports.analyze = analyze;
module.exports.decide = decide;
module.exports.stripCode = stripCode;
