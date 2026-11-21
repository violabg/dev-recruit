import { bullets, prompt } from "@/lib/services/ai/prompt-text";
import { describe, expect, it } from "vitest";

describe("prompt", () => {
  it("removes the common indentation of the literal and keeps the relative one", () => {
    const text = prompt`
      Title
        - nested
      End
    `;
    expect(text).toBe("Title\n  - nested\nEnd");
  });

  it("never touches the indentation of interpolated values", () => {
    const code = "function a() {\n    return 1;\n}";
    expect(prompt`
      Code:
      ${code}
    `).toBe(`Code:\n${code}`);
  });

  it("drops lines left empty by conditionals and collapses blank lines", () => {
    const empty = "";
    expect(prompt`
      A
      ${empty}


      B
    `).toBe("A\n\nB");
  });
});

describe("bullets", () => {
  it("lists only the non-empty lines", () => {
    expect(bullets(["a", false, undefined, "", "b"])).toBe("- a\n- b");
    expect(bullets([])).toBe("");
  });
});
