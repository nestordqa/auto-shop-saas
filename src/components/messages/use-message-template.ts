"use client";

import { useSyncExternalStore } from "react";

import { MESSAGE_TEMPLATES, type TemplateKey } from "@/lib/message-templates";

// One fetch per page load, shared by every component; defaults are used until (or if) it arrives.
let saved: Partial<Record<TemplateKey, string>> | null = null;
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load() {
  request ??= fetch("/api/message-templates")
    .then((response) => (response.ok ? response.json() : null))
    .then((result: { templates?: Record<TemplateKey, string> } | null) => {
      saved = result?.templates ?? {};
      listeners.forEach((listener) => listener());
    })
    .catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => listeners.delete(listener);
}

/** Admin-edited body of a WhatsApp template, or its default. */
export function useMessageTemplate(key: TemplateKey) {
  return useSyncExternalStore(subscribe, () => saved?.[key] ?? MESSAGE_TEMPLATES[key].body, () => MESSAGE_TEMPLATES[key].body);
}

/** After an admin saves, other open screens pick up the new text on their next load. */
export function forgetMessageTemplates() {
  saved = null;
  request = null;
}
