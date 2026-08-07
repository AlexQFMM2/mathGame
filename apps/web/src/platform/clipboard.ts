export interface ClipboardAdapter {
  writeText(value: string): Promise<boolean>;
}

function copyWithSelection(value: string): boolean {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  return copied;
}

export const browserClipboard: ClipboardAdapter = {
  async writeText(value) {
    try {
      if (navigator.clipboard?.writeText !== undefined) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return copyWithSelection(value);
    } catch {
      try {
        return copyWithSelection(value);
      } catch {
        return false;
      }
    }
  },
};
