<script lang="ts">
	import { onMount } from 'svelte';
	import Flipbook from './Flipbook.svelte';
	import { loadPdf, renderPageToBlob } from './pdf-engine.js';
	import type { PDFDocumentProxy } from 'pdfjs-dist';

	let { source } = $props();

	// State
	let pages: string[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);
	let pdfDoc: PDFDocumentProxy | null = null;

	// Effect to load PDF when source changes
	$effect(() => {
		// Untrack or just simple dependency?
		// specific source change trigger
		if (source) {
			loadSource(source);
		}
	});

	async function loadSource(url: string) {
		loading = true;
		error = null;
		pages = []; // Reset pages

		try {
			pdfDoc = await loadPdf(url);
			const numPages = pdfDoc.numPages;

			// Render Strategy:
			// 1. Render first 2-4 pages immediately for quick TTI
			// 2. Render the rest in background

			const initialLoadCount = Math.min(numPages, 4);
			const newPages: string[] = [];

			// Phase 1: Initial
			for (let i = 1; i <= initialLoadCount; i++) {
				const blobUrl = await renderPageToBlob(pdfDoc, i);
				newPages.push(blobUrl);
			}

			// Update state to show something
			pages = [...newPages];
			loading = false;

			// Phase 2: Background load rest
			if (numPages > initialLoadCount) {
				renderBackgroundPages(initialLoadCount + 1, numPages);
			}
		} catch (e: any) {
			console.error('Failed to load PDF', e);
			error = e.message || 'Unknown error';
			loading = false;
		}
	}

	async function renderBackgroundPages(start: number, end: number) {
		if (!pdfDoc) return;

		for (let i = start; i <= end; i++) {
			try {
				const blobUrl = await renderPageToBlob(pdfDoc, i);
				// Append one by one or batch?
				// Valid Svelte 5 array push often works well with proxy
				pages.push(blobUrl);
			} catch (e) {
				console.warn(`Failed to render page ${i}`, e);
			}
		}
	}
</script>

<div class="pdf-flipbook-wrapper">
	{#if error}
		<div class="error">
			<p>Error loading PDF: {error}</p>
		</div>
	{/if}

	{#if loading && pages.length === 0}
		<div class="loading">
			<p>Loading Book...</p>
		</div>
	{/if}

	{#if pages.length > 0}
		<!-- Pass pages state. Since it's a proxy, Flipbook should react if it uses $derived or $effect -->
		<Flipbook {pages} />
	{/if}
</div>

<style>
	.pdf-flipbook-wrapper {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.loading,
	.error {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f9f9f9;
		color: #555;
		z-index: 10;
	}

	.error {
		color: red;
		background: #fff0f0;
	}
</style>
