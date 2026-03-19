function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

const CANONICAL_SCHEMES = new Set(["path", "host", "target"]);

export function parseResourceRef(ref) {
  const value = String(ref || "").trim();
  if (!value) {
    return {
      raw: value,
      kind: "invalid",
      scheme: null,
      value: ""
    };
  }

  const separatorIndex = value.indexOf(":");
  if (separatorIndex <= 0) {
    return {
      raw: value,
      kind: "opaque",
      scheme: null,
      value
    };
  }

  const scheme = value.slice(0, separatorIndex).toLowerCase();
  const remainder = value.slice(separatorIndex + 1);

  if (scheme.endsWith("_hash")) {
    return {
      raw: value,
      kind: "opaque",
      scheme,
      value: remainder
    };
  }

  if (!CANONICAL_SCHEMES.has(scheme) || !remainder) {
    return {
      raw: value,
      kind: "opaque",
      scheme,
      value: remainder
    };
  }

  return {
    raw: value,
    kind: "canonical",
    scheme,
    value: remainder
  };
}

export function listCandidateResourceRefs(normalizedAction) {
  const candidates = [];

  for (const ref of normalizedAction?.resource_refs || []) {
    const parsed = parseResourceRef(ref);
    if (parsed.kind === "canonical") {
      candidates.push(parsed);
    }
  }

  if (normalizedAction?.target) {
    candidates.push(parseResourceRef(`target:${normalizedAction.target}`));
  }

  return candidates.filter((candidate) => candidate.kind === "canonical");
}

export function hasCanonicalResourceRef(normalizedAction, scheme) {
  return listCandidateResourceRefs(normalizedAction).some((candidate) => !scheme || candidate.scheme === scheme);
}

export function getPrimaryCanonicalResourceRef(normalizedAction, scheme) {
  return listCandidateResourceRefs(normalizedAction).find((candidate) => !scheme || candidate.scheme === scheme) || null;
}

function createMatcher(pattern) {
  const source = String(pattern || "");
  if (!source.includes("*")) {
    return {
      match_kind: "exact",
      matches(value) {
        return value === source;
      }
    };
  }

  if (source.endsWith("*") && source.indexOf("*") === source.length - 1) {
    const prefix = source.slice(0, -1);
    return {
      match_kind: "prefix",
      matches(value) {
        return value.startsWith(prefix);
      }
    };
  }

  const regexp = new RegExp(`^${source.split("*").map(escapeRegex).join(".*")}$`);
  return {
    match_kind: "glob",
    matches(value) {
      return regexp.test(value);
    }
  };
}

export function createScopeRuleMatcher(rule) {
  const parsedResource = parseResourceRef(rule?.resource || rule?.scope || "");
  if (parsedResource.kind !== "canonical") {
    return null;
  }

  const matcher = createMatcher(parsedResource.value);
  return {
    scheme: parsedResource.scheme,
    pattern: parsedResource.raw,
    match_kind: matcher.match_kind,
    matches(candidate) {
      return candidate.scheme === parsedResource.scheme && matcher.matches(candidate.value);
    }
  };
}

export function matchScopeRule(rule, normalizedAction) {
  if (rule?.action_class && rule.action_class !== normalizedAction?.action_class) {
    return null;
  }

  const matcher = createScopeRuleMatcher(rule);
  if (!matcher) {
    return null;
  }

  for (const candidate of listCandidateResourceRefs(normalizedAction)) {
    if (matcher.matches(candidate)) {
      return {
        matched_resource: candidate.raw,
        scheme: candidate.scheme,
        pattern: matcher.pattern,
        match_kind: matcher.match_kind
      };
    }
  }

  return null;
}

