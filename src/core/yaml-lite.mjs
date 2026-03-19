function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "{}") return {};
  if (trimmed === "[]") return [];
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function tokenize(source) {
  return source
    .split(/\r?\n/)
    .map((line) => {
      const commentIndex = line.indexOf("#");
      const content = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
      return {
        indent: content.match(/^ */)[0].length,
        text: content.trimEnd()
      };
    })
    .filter((line) => line.text.trim().length > 0)
    .map((line) => ({
      indent: line.indent,
      text: line.text.trim()
    }));
}

function parseNode(tokens, startIndex, indent) {
  if (startIndex >= tokens.length) {
    return [null, startIndex];
  }

  const token = tokens[startIndex];
  if (token.indent < indent) {
    return [null, startIndex];
  }

  if (token.text.startsWith("- ")) {
    return parseArray(tokens, startIndex, indent);
  }

  return parseObject(tokens, startIndex, indent);
}

function parseObject(tokens, startIndex, indent) {
  const value = {};
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.indent < indent || token.text.startsWith("- ")) {
      break;
    }
    if (token.indent > indent) {
      throw new Error(`Unexpected indentation at line ${index + 1}`);
    }

    const separatorIndex = token.text.indexOf(":");
    if (separatorIndex <= 0) {
      throw new Error(`Invalid YAML object entry at line ${index + 1}`);
    }

    const key = token.text.slice(0, separatorIndex).trim();
    const rest = token.text.slice(separatorIndex + 1).trim();
    if (!rest) {
      const [child, nextIndex] = parseNode(tokens, index + 1, indent + 2);
      value[key] = child;
      index = nextIndex;
      continue;
    }

    value[key] = parseScalar(rest);
    index += 1;
  }

  return [value, index];
}

function parseArray(tokens, startIndex, indent) {
  const value = [];
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.indent < indent || !token.text.startsWith("- ")) {
      break;
    }
    if (token.indent > indent) {
      throw new Error(`Unexpected indentation at line ${index + 1}`);
    }

    const rest = token.text.slice(2).trim();
    if (!rest) {
      const [child, nextIndex] = parseNode(tokens, index + 1, indent + 2);
      value.push(child);
      index = nextIndex;
      continue;
    }

    if (rest.includes(":")) {
      const syntheticToken = {
        indent: indent + 2,
        text: rest
      };
      const nested = [syntheticToken];
      let nextIndex = index + 1;
      while (nextIndex < tokens.length && tokens[nextIndex].indent > indent) {
        nested.push(tokens[nextIndex]);
        nextIndex += 1;
      }
      const [child] = parseObject(nested, 0, indent + 2);
      value.push(child);
      index = nextIndex;
      continue;
    }

    value.push(parseScalar(rest));
    index += 1;
  }

  return [value, index];
}

function needsQuotes(value) {
  return value === "" || /[:#\-\s]/.test(value);
}

function serializeScalar(value) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    return needsQuotes(value) ? JSON.stringify(value) : value;
  }
  if (Array.isArray(value) && value.length === 0) return "[]";
  if (typeof value === "object" && value && Object.keys(value).length === 0) return "{}";
  return JSON.stringify(value);
}

function serializeNode(value, indent) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${pad}[]`;
    }
    return value.map((entry) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const lines = serializeNode(entry, indent + 2).split("\n");
        return `${pad}- ${lines[0].trimStart()}\n${lines.slice(1).join("\n")}`;
      }
      if (Array.isArray(entry)) {
        return `${pad}-\n${serializeNode(entry, indent + 2)}`;
      }
      return `${pad}- ${serializeScalar(entry)}`;
    }).join("\n");
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, entry]) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry) && Object.keys(entry).length > 0) {
        return `${pad}${key}:\n${serializeNode(entry, indent + 2)}`;
      }
      if (Array.isArray(entry) && entry.length > 0) {
        return `${pad}${key}:\n${serializeNode(entry, indent + 2)}`;
      }
      return `${pad}${key}: ${serializeScalar(entry)}`;
    }).join("\n");
  }

  return `${pad}${serializeScalar(value)}`;
}

export function parseYaml(source) {
  const tokens = tokenize(source);
  if (tokens.length === 0) {
    return {};
  }
  const [value] = parseNode(tokens, 0, tokens[0].indent);
  return value;
}

export function stringifyYaml(value) {
  return `${serializeNode(value, 0)}\n`;
}

