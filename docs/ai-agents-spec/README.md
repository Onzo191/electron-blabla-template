# AI Agents Module Specification & Clone Kit

This directory contains the technical documentation, state management flows, API references, and localization strings for the **AI Agents** module located in `@react/modules/ai-agents`.

This kit provides complete specifications (including algorithms, JSON schemas, and localization data) to help you, your teammates, and AI-assisted coding agents rebuild or clone this module on any technology stack.

---

## 📂 Directory Contents

### 1. 📘 [Architecture & UX Flows (architecture-and-flows.md)](file:///Users/lap15644/Desktop/myVNG/myvng-web/react/ai-agents-spec/architecture-and-flows.md)
Focuses on front-end components and client states:
- **Routing structure** and layout pages (`page.tsx`, `layout.tsx`, `[conversationId]/page.tsx`).
- **State Management**: Zustand and React Query state schemas and hooks.
- **Smooth Streaming Rendering**: Token Queue parsing combined with `requestAnimationFrame` for a smooth word-by-word typing effect.
- **Smart Auto-Scrolling**: Scrolling behaviors that track user interaction to enable/disable auto-scroll.
- **Infinite History Load**: Scroll height delta calculations to maintain scroll positions during pagination.

### 2. 🔌 [API Reference (api-reference.md)](file:///Users/lap15644/Desktop/myVNG/myvng-web/react/ai-agents-spec/api-reference.md)
Defines all client-backend connection endpoints:
- **General Configuration**: Base URLs and authentication header models.
- **REST Endpoints**: Comprehensive catalog of GET/POST/PATCH/DELETE endpoints for Agents, Conversations, Attachments, and MCP connectors.
- **SSE Stream Protocol**: SSE response formats for `POST v2/api/messages/ask`, mapping chunks to content, reasoning accordion blocks, tool status alerts, and errors.

### 3. 📝 [Markdown Templates Specification (markdown-templates-spec.md)](file:///Users/lap15644/Desktop/myVNG/myvng-web/react/ai-agents-spec/markdown-templates-spec.md)
Explains rendering rich UI widgets inside Markdown:
- **Block boundaries**: Tag matches for data wrappers (e.g. `====MEDIA====`).
- **AI Citation cleaning**: Regex cleanups for metadata tags.
- **9 UI Widgets Details**: Schemas, properties, and click event flows for *Colleague Card*, *Media Grid*, *Suggestion*, *Support Contact*, *References*, *Direct Attachments*, *Export Artifact*, *Export Format Picker*, and *Closing* blocks.

### 4. 🌐 [Localization Strings (locales-strings.json)](file:///Users/lap15644/Desktop/myVNG/myvng-web/react/ai-agents-spec/locales-strings.json)
- Consolidates all UI strings for both the `aiAgents` and `chatbot` namespaces.
- Supports **6 languages**: English (`en`), Vietnamese (`vi`), Thai (`th`), Indonesian (`id`), Simplified Chinese (`zhCn`), and Traditional Chinese (`zhTw`).
