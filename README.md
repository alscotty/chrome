# Serenade Chrome Extension

Source for the [Serenade Chrome Extension](https://chrome.google.com/webstore/detail/serenade-for-chrome/bgfbijeikimjmdjldemlegooghdjinmj?hl=en)

## Changelog
- v 2.0.5, merged 9/9/2025, confirmed chrome version Version 140.0.7339.133 (Official Build) (arm64). Adds trusted types compatibility for google suite apps (and other that might use this feature) See [docs](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) 

## Alscotty hotfix 8/21/2025
- refactored to make it more compliant with manifest_v3, extension what hitting issues with injecting the content scripts, thus it was not executing commands like clicks/typing, particularly "show links" or "show inputs" were loading overlay but unable to actually click
- now it is working again! tested on chrome
- the tests need some updating (as the show fails for content script still, inaccurate) but the playwright stuff is a good start to test for regressions etc. 

## Installation

1. Download `build.zip` and unzip
2. In Chrome, go to [chrome://extensions](chrome://extensions) and enable Developer Mode
3. Click "Load unpacked" and select the unzipped `build` folder

You may need to reload any tabs that were open before the extension was loaded.

## Design

Chrome extensions generally contain three types of scripts that each have access to different parts of the browser API and page content:
- **Background workers/extension code** have full access to the browser APIs and handles the parts of the extension that do not depend on the content of a given page.
- **Content scripts** have access to some of the browser APIs and access to the page DOM, but do not have access to any of the `window` properties or the page's global namespace.
- **Injected content scripts** are embedded script tags that are added by the content script, and have full access to the page content as well as the `window` properties and the page's global namespace.

Each of these script types can communicate between each other with browser events. The source for this extension falls into these categories as follows:

- Extension code
  - `extension.ts`: Entry-point for the extension
  - `ipc.ts`: Handles communication between the Serenade app and the Chrome extension. Also determines which command handler to send each incoming command to.
  - `extension-command-handler.ts`: Handles commands that do not need page content/require access to the browser APIs (e.g. tab management)
- Content scripts
  - `content-script.ts`: Adds the tag containing the injected scripts and sets up communication between `ipc.ts` and the injected code
- Injected scripts
  - `injected.ts`: Sets up injected code and handles communication between injected code and the content script
  - `injected-command-handler.ts`: Handles commands that need access to the page content or objects in the page's global namespace
  - `editors.ts`: Defines interactions with text editors using a common API

Most of the extensions functionality is in three files: `extension-command-handler.ts`, `injected-command-handler.ts`, and `editors.ts`.

### Command Handlers

Both command handlers contain functions named for the various command types in the [Serenade Protocol](https://serenade.ai/docs/protocol/#commands-reference). These functions take a `data` object as a parameter and return a promise to the relevant response data (if any).

### Editors

We currently support editing text in `textarea` and `input` tags, as well as a few third-party browser editors (Ace, CodeMirror, and Monaco). Each of these editor types are extensions of the `Editor` class that implement these functions:
  - `active()`: Returns whether the current active DOM element is of the object type
  - `getEditorState()`: Returns an object containing the source, cursor offset, file name, and a boolean to indicate the source was available
  - `setSelection(cursor: number, cursorEnd: number)`: Sets the selection to be between `cursor` and `cursorEnd`
  - `setSourceAndCursor(source: string, cursor: number)`: Sets the content of the editor to `source` and moves the cursor to `cursor`
  - `undo`/`redo`: Undo/redo edits

Supporting a new editor is a matter of implementing these functions.

The `Editor` class also contains some helper functions to determine a suitable file name from a language name and to calculate a cursor position from the cursor row and column and vice versa. Third-party editors also have a private `editor()` method to capture the Javascript object corresponding to the editor from the page's global namespace, making the third-party API available.

## Development

1. Clone this repository
2. Run `npm install` to get dependencies
3. Run `npm run build` (or `npm run watch` to automatically update while iterating)

- This creates `build/extension.js`, `build/content-script.js`, and `build/injected.js`

4. In Chrome, go to [chrome://extensions](chrome://extensions) and enable Developer Mode
5. Click "Load unpacked" and select the `chrome` repository
6. Test the extension
   - When iterating, make sure you update the extension by clicking "Update" on the Chrome Extensions page and refreshing the page you are using to test
   - Running `npm run test` will serve a simple page at `localhost:8001` with instances of the various inputs/code editors we support
   - The source for this test page can be found in `src/test`

## Deployment

1. Update the version number in `manifest.json`
2. Run `npm run dist`
3. Upload the new `build.zip` file to the Chrome Web Store
