# Svelte PDF Flipbook Component

A high-performance, interactive 3D flipbook component for Svelte applications that can process and display PDF documents with smooth page-turning animations and touch support. Built on top of PDF.js for reliable PDF rendering.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/svelte-flipbook.svg)](https://badge.fury.io/js/svelte-flipbook)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## Features

- **PDF Processing** - Built-in PDF.js integration for rendering PDF documents
- **Progressive Loading** - Loads first few pages immediately and others in background
- **Image Preloading** - Smooth loading of pages with placeholders
- **3D Page Turn Effect** - Realistic page curl with dynamic lighting
- **Touch & Swipe Support** - Native feel on mobile devices
- **Zoom & Pan** - Pinch-to-zoom and smooth panning
- **Dark Mode** - Automatic dark mode support
- **Accessible** - Keyboard navigation and ARIA labels
- **Responsive** - Adapts to any screen size
- **Optimized** - 60fps animations with requestAnimationFrame

## Installation

```bash
# Using npm
npm install svelte-flipbook

# Using pnpm
pnpm add svelte-flipbook

# Using yarn
yarn add svelte-flipbook
```

## Basic Usage

### For Image Galleries:
```svelte
<script>
  import Flipbook from 'svelte-flipbook';
  
  const pages = [
    '/path/to/page1.jpg',
    '/path/to/page2.jpg',
    '/path/to/page3.jpg',
  ];
</script>

<Flipbook {pages} />
```

### For PDF Documents:
```svelte
<script>
  import { PdfFlipbook } from 'svelte-flipbook';
</script>

<!-- Load PDF from URL -->
<PdfFlipbook source="/path/to/document.pdf" />

<!-- Or load PDF from Blob/File -->
<PdfFlipbook source={blob} />
```

The PDF component will automatically handle:
- PDF loading and rendering
- Progressive page loading (first few pages load immediately, others in background)
- Error handling
- Loading states

## Components

### 1. `Flipbook`
For displaying image galleries with page-turning effects.

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pages` | `string[]` | `[]` | Array of image URLs to display as pages |
| `startPage` | `number` | `0` | Initial page to display |
| `nPolygons` | `number` | `10` | Number of polygons used for page curl effect |
| `dragToFlip` | `boolean` | `true` | Enable/disable drag to flip |
| `singlePage` | `boolean` | `false` | Show one page at a time |
| `forwardDirection` | `'left'\|'right'` | `'right'` | Direction of page turning |
| `zooms` | `number[]` | `[1, 2, 4]` | Available zoom levels |
| `zoomDuration` | `number` | `500` | Zoom animation duration in ms |
| `clickToZoom` | `boolean` | `true` | Enable/disable click to zoom |

### 2. `PdfFlipbook`
For displaying PDF documents with automatic page rendering.

#### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | `string \| File \| Blob` | - | PDF source (URL, File, or Blob) |
| `startPage` | `number` | `0` | Initial page to display |
| `nPolygons` | `number` | `10` | Number of polygons used for page curl effect |
| `dragToFlip` | `boolean` | `true` | Enable/disable drag to flip |
| `singlePage` | `boolean` | `false` | Show one page at a time |
| `forwardDirection` | `'left'\|'right'` | `'right'` | Direction of page turning |
| `zooms` | `number[]` | `[1, 2, 4]` | Available zoom levels |
| `zoomDuration` | `number` | `500` | Zoom animation duration in ms |
| `clickToZoom` | `boolean` | `true` | Enable/disable click to zoom |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `pageChange` | `{ page: number }` | Triggered when page changes |
| `zoom` | `{ zoom: number }` | Triggered when zoom level changes |
| `load` | `{ loaded: number, total: number }` | Triggered when pages are loaded |

## Methods

Access methods using `bind:this`:

```svelte
<script>
  import Flipbook from 'svelte-flipbook';
  
  let flipbook;
  
  function nextPage() {
    if (flipbook) flipbook.nextPage();
  }
</script>

<Flipbook bind:this={flipbook} />
<button on:click={nextPage}>Next Page</button>
```

### Available Methods

- `nextPage()` - Go to next page
- `prevPage()` - Go to previous page
- `goToPage(page: number)` - Go to specific page
- `zoomIn()` - Zoom in one level
- `zoomOut()` - Zoom out one level
- `zoomTo(level: number)` - Zoom to specific level

## Advanced Usage

### Custom Controls

```svelte
<Flipbook {pages} let:flipLeft let:flipRight let:zoomIn let:zoomOut>
  <div class="controls">
    <button on:click={flipLeft} disabled={!canFlipLeft}>
      Previous
    </button>
    <button on:click={flipRight} disabled={!canFlipRight}>
      Next
    </button>
    <button on:click={zoomIn}>+</button>
    <button on:click={zoomOut}>-</button>
  </div>
</Flipbook>

<style>
  .controls {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 100;
  }
  
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: #333;
    color: white;
    cursor: pointer;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

### Custom Loading State

```svelte
<Flipbook {pages} let:loading>
  {#if loading}
    <div class="loading">
      Loading pages...
    </div>
  {/if}
</Flipbook>

<style>
  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: 8px;
  }
</style>
```

## PDF Processing Details

The `PdfFlipbook` component uses PDF.js under the hood to render PDF documents. It includes a pre-configured worker for optimal performance.

### Key Features

1. **Progressive Loading**:
   - Loads first 4 pages immediately for quick initial display
   - Renders remaining pages in the background
   - Updates the UI as pages become available

2. **Memory Management**:
   - Renders PDF pages to blob URLs for efficient memory usage
   - Automatically cleans up resources when component is destroyed
   - Handles large PDFs efficiently with lazy loading

3. **Built-in Worker**:
   - Includes a pre-configured PDF.js worker in the static folder
   - No additional setup required
   - Optimized for both development and production builds

4. **Error Handling**:
   - Catches and displays PDF loading/rendering errors
   - Provides loading states for better UX
   - Handles network issues gracefully

## Development

### Prerequisites
- Node.js 18+
- pnpm (recommended)
- Modern browser with WebAssembly support

### Building for Production

When building for production, the PDF worker will be automatically included from the static folder. No additional configuration is needed.

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build
```

### Development Server

To start the development server with hot module replacement:

```bash
pnpm dev
```

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start development server:
   ```bash
   pnpm dev
   ```
4. Build for production:
   ```bash
   pnpm build
   ```
5. Run tests:
   ```bash
   pnpm test
   ```
