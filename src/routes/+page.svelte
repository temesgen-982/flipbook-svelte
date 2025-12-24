<script lang="ts">
	import { PdfFlipbook } from '$lib/index.js';

	// Sample PDF from Mozilla (CORS enabled)
	// 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' is a classic 14 page PDF.

	// Sample PDF from static folder
	const samplePdf = '/sample.pdf';
</script>

<div class="demo-container">
	<h1>Svelte 5 Flipbook Demo</h1>
	<div class="book-viewport">
		<PdfFlipbook source={samplePdf} />
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: sans-serif;
	}

	.demo-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #333;
		color: white;
	}

	h1 {
		margin: 1rem;
	}

	.book-viewport {
		flex: 1;
		width: 100%;
		display: flex;
		justify-content: center;
		overflow: hidden;
	}
</style>
