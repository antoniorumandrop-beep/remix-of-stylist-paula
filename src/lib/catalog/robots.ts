/**
 * A minimal robots.txt reader.
 *
 * `research/bodytech-09-og-image-test.md` ends on a recommendation rather than
 * a measurement: fetch with our own honest User-Agent and respect robots.txt.
 * Zalando is the reason it matters — it allows `User-agent: *` on product
 * paths while banning named AI crawlers (`ClaudeBot`, `GPTBot`, …) from the
 * whole domain. A parser that ignores robots would not notice the difference,
 * and the difference is the whole point: we are fetching one page a person
 * asked for, under a name that says who we are.
 *
 * Deliberately small. It implements the parts of the original 1994 standard
 * that shops actually use — group headers, Disallow, Allow, `*` and `$`
 * wildcards, longest-match-wins — and nothing else. Crawl-delay and Sitemap
 * are ignored because we do not crawl.
 */

export interface RobotsRules {
  /** Empty means "nothing is disallowed", which is also what a missing file means. */
  rules: { allow: boolean; path: string }[];
}

/**
 * Groups are matched by exact (case-insensitive) user-agent name, falling back
 * to `*`. A real crawler matches on prefix; we do not, because our name is
 * fixed and an accidental prefix match would only ever loosen the rules.
 */
export function parseRobots(text: string, userAgent: string): RobotsRules {
  const wanted = userAgent.toLowerCase();
  const groups = new Map<string, { allow: boolean; path: string }[]>();

  let currentAgents: string[] = [];
  // A blank line ends a group, but only after rules — consecutive `User-agent`
  // lines share one rule block, which is how shops write "these bots, same ban".
  let sawRuleInGroup = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const field = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (field === 'user-agent') {
      if (sawRuleInGroup) { currentAgents = []; sawRuleInGroup = false; }
      currentAgents.push(value.toLowerCase());
      continue;
    }
    if (field !== 'allow' && field !== 'disallow') continue;
    if (currentAgents.length === 0) continue;

    sawRuleInGroup = true;
    // "Disallow:" with an empty value is the explicit "everything is allowed".
    if (field === 'disallow' && value === '') continue;
    for (const agent of currentAgents) {
      const list = groups.get(agent) ?? [];
      list.push({ allow: field === 'allow', path: value });
      groups.set(agent, list);
    }
  }

  return { rules: groups.get(wanted) ?? groups.get('*') ?? [] };
}

/** Turns a robots path pattern into a matcher, honouring `*` and a trailing `$`. */
function matchLength(pattern: string, path: string): number {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  if (!body.includes('*')) {
    if (anchored) return path === body ? body.length : -1;
    return path.startsWith(body) ? body.length : -1;
  }
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const re = new RegExp('^' + escaped + (anchored ? '$' : ''));
  return re.test(path) ? body.length : -1;
}

/**
 * Longest matching pattern wins; Allow wins ties. That tie-break is what lets
 * a shop write `Disallow: /` plus `Allow: /produkt/` and mean it.
 */
export function isAllowed(rules: RobotsRules, pathname: string): boolean {
  let best = { length: -1, allow: true };
  for (const rule of rules.rules) {
    const length = matchLength(rule.path, pathname);
    if (length < 0) continue;
    if (length > best.length || (length === best.length && rule.allow)) {
      best = { length, allow: rule.allow };
    }
  }
  return best.allow;
}
