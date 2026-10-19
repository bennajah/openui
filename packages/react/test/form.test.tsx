import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "../src/checkbox.tsx";
import { Field } from "../src/field.tsx";
import { Input } from "../src/input.tsx";
import { Label } from "../src/label.tsx";
import { Radio } from "../src/radio.tsx";
import { Select } from "../src/select.tsx";
import { Textarea } from "../src/textarea.tsx";
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY, readTheme, resolveTheme } from "../src/theme.ts";
import { ThemeToggle } from "../src/theme-toggle.tsx";

describe("Input (React)", () => {
  it("renders a text-ish field with default classes", () => {
    const html = renderToStaticMarkup(<Input name="email" />);
    expect(html).toContain("<input");
    expect(html).toContain('name="email"');
    expect(html).toContain("h-10");
    expect(html).toContain("border-zinc-300");
    expect(html).not.toContain("aria-invalid");
  });

  it("switches to the invalid border and sets aria-invalid", () => {
    const html = renderToStaticMarkup(<Input invalid />);
    expect(html).toContain("border-red-500");
    expect(html).toContain('aria-invalid="true"');
    expect(html).not.toContain("border-zinc-300");
  });

  it("forwards native attributes and merges classes", () => {
    const html = renderToStaticMarkup(
      <Input type="password" required placeholder="Secret" className="custom" />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain("required");
    expect(html).toContain("custom");
  });
});

describe("Textarea (React)", () => {
  it("renders with four rows by default", () => {
    const html = renderToStaticMarkup(<Textarea />);
    expect(html).toContain("<textarea");
    expect(html).toContain('rows="4"');
    expect(html).toContain("min-h-20");
  });

  it("honors rows and invalid", () => {
    const html = renderToStaticMarkup(<Textarea rows={8} invalid />);
    expect(html).toContain('rows="8"');
    expect(html).toContain("border-red-500");
    expect(html).toContain('aria-invalid="true"');
  });
});

describe("Select (React)", () => {
  it("renders a select wrapping its options with a decorative chevron", () => {
    const html = renderToStaticMarkup(
      <Select name="role" defaultValue="dev">
        <option value="dev">Developer</option>
        <option value="ops">Operations</option>
      </Select>,
    );
    expect(html).toContain("<select");
    expect(html).toContain('name="role"');
    expect(html).toContain("<option");
    expect(html).toContain("appearance-none");
    expect(html).toContain('aria-hidden="true"');
  });

  it("marks invalid state", () => {
    const html = renderToStaticMarkup(<Select invalid />);
    expect(html).toContain("border-red-500");
    expect(html).toContain('aria-invalid="true"');
  });
});

describe("Checkbox (React)", () => {
  it("renders a checkbox with the accent utility", () => {
    const html = renderToStaticMarkup(<Checkbox name="terms" />);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="terms"');
    expect(html).toContain("accent-zinc-900");
  });

  it("supports controlled and invalid states", () => {
    const html = renderToStaticMarkup(<Checkbox checked readOnly invalid />);
    expect(html).toContain("checked");
    expect(html).toContain("outline-red-500");
    expect(html).toContain('aria-invalid="true"');
  });
});

describe("Radio (React)", () => {
  it("renders a radio input", () => {
    const html = renderToStaticMarkup(<Radio name="plan" value="pro" />);
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="plan"');
    expect(html).toContain('value="pro"');
  });

  it("uses a data attribute for the invalid outline (not aria-invalid)", () => {
    const html = renderToStaticMarkup(<Radio name="plan" invalid />);
    expect(html).toContain("outline-red-500");
    expect(html).toContain('data-invalid="true"');
    expect(html).not.toContain("aria-invalid");
  });
});

describe("Label (React)", () => {
  it("renders a label associated with a control", () => {
    const html = renderToStaticMarkup(<Label htmlFor="email">Email</Label>);
    expect(html).toContain("<label");
    expect(html).toContain('for="email"');
    expect(html).toContain(">Email</label>");
    expect(html).toContain("peer-disabled:opacity-70");
  });
});

describe("Field (React)", () => {
  it("wires label, control, and hint together", () => {
    const html = renderToStaticMarkup(
      <Field label="Email" hint="We never share it.">
        {({ controlProps }) => <Input {...controlProps} />}
      </Field>,
    );
    expect(html).toContain("<label");
    expect(html).toContain("Email");
    expect(html).toContain("We never share it.");
    // The hint id must appear both as a description target and on the message.
    const described = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(described).toBeTruthy();
    expect(html).toContain(`id="${described}"`);
  });

  it("links the error message and marks the control invalid", () => {
    const html = renderToStaticMarkup(
      <Field label="Email" error="Required">
        {({ controlProps }) => <Input {...controlProps} />}
      </Field>,
    );
    expect(html).toContain("Required");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("text-red-600");
  });

  it("accepts plain children and an explicit id", () => {
    const html = renderToStaticMarkup(
      <Field label="Name" id="name">
        <Input id="name" />
      </Field>,
    );
    expect(html).toContain('for="name"');
    expect(html).toContain('id="name"');
  });
});

describe("Theme (React)", () => {
  it("renders a button with an accessible label and the system icon by default", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Theme: System theme. Click to switch."');
    expect(html).toContain("<rect");
  });

  it("renders the matching icon for an explicit initial theme", () => {
    expect(renderToStaticMarkup(<ThemeToggle initialTheme="light" />)).toContain("<circle");
    expect(renderToStaticMarkup(<ThemeToggle initialTheme="dark" />)).toContain(
      'd="M12 3a6 6 0 0 0 9 9',
    );
  });

  it("merges custom classes and forwards attributes", () => {
    const html = renderToStaticMarkup(<ThemeToggle className="custom" data-testid="toggle" />);
    expect(html).toContain("custom");
    expect(html).toContain('data-testid="toggle"');
  });

  it("exposes a storage key and a no-flash init script", () => {
    expect(THEME_STORAGE_KEY).toBe("openui-theme");
    expect(THEME_INIT_SCRIPT).toContain("openui-theme");
    expect(THEME_INIT_SCRIPT).toContain("prefers-color-scheme");
    expect(THEME_INIT_SCRIPT).toContain(".toggle");
  });

  it("resolves system against the media query and passes through explicit values", () => {
    // No window in this environment, so system resolves to light.
    expect(resolveTheme("system")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    expect(readTheme()).toBe("system");
  });
});
