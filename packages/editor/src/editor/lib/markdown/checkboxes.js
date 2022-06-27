const CHECKBOX_REGEX = /\[(X|\s|_|-)\]\s(.*)?/i;

function matches(token) {
  return token.content.match(CHECKBOX_REGEX);
}

function isInline(token) {
  return token.type === "inline";
}
function isParagraph(token) {
  return token.type === "paragraph_open";
}

function looksLikeChecklist(tokens, index) {
  return (
    isInline(tokens[index]) &&
    isParagraph(tokens[index - 1]) &&
    matches(tokens[index])
  );
}

export default function markdownItCheckbox(md) {
  function render(tokens, idx) {
    const token = tokens[idx];
    const checked = !!token.attrGet("checked");

    if (token.nesting === 1) {
      // opening tag
      return `<li><span class="checkbox">${checked ? "[x]" : "[ ]"}</span>`;
    } else {
      // closing tag
      return "</li>\n";
    }
  }

  md.renderer.rules.checkbox_item_open = render;
  md.renderer.rules.checkbox_item_close = render;

  // insert a new rule after the "inline" rules are parsed
  md.core.ruler.after("inline", "checkboxes", (state) => {
    const tokens = state.tokens;

    // work backwards through the tokens and find text that looks like a checkbox
    for (let i = tokens.length - 1; i > 0; i--) {
      const matches = looksLikeChecklist(tokens, i);
      if (matches) {
        const value = matches[1];
        const checked = value.toLowerCase() === "x";

        // convert surrounding list tokens
        if (tokens[i - 3].type === "bullet_list_open") {
          tokens[i - 3].type = "checkbox_list_open";
        }

        if (tokens[i + 3].type === "bullet_list_close") {
          tokens[i + 3].type = "checkbox_list_close";
        }

        // remove [ ] [x] from list item label – must use the content from the
        // child for escaped characters to be unescaped correctly.
        const tokenChildren = tokens[i].children;
        if (tokenChildren) {
          const contentMatches = tokenChildren[0].content.match(CHECKBOX_REGEX);

          if (contentMatches) {
            const label = contentMatches[2];

            tokens[i].content = label;
            tokenChildren[0].content = label;
          }
        }

        // open list item and ensure checked state is transferred
        tokens[i - 2].type = "checkbox_item_open";

        if (checked === true) {
          tokens[i - 2].attrs = [["checked", "true"]];
        }

        // close the list item
        let j = i;
        while (tokens[j].type !== "list_item_close") {
          j++;
        }
        tokens[j].type = "checkbox_item_close";
      }
    }

    return false;
  });
}
