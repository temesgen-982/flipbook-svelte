<script lang="ts">
	import { onMount } from 'svelte';
	import { Matrix } from './matrix.js';

	/**
	 * FLIPBOOK CORE COMPONENT (Svelte 5) - Curled Version with Swipe Navigation
	 */
	let {
		pages = [] as string[],
		startPage = 0,
		nPolygons = 10,
		swipeMin = 3,
		dragToFlip = true,
		singlePage = false,
		forwardDirection = 'right' as 'left' | 'right',
		zooms = [1, 2, 4],
		zoomDuration = 500,
		clickToZoom = true
	} = $props();

	// State
	let currentPage = $state(startPage);
	let displayedPages = $state(1); // will be updated by resize

	// Page tracking (matches Vue's firstPage/secondPage)
	// These track which pages are being displayed/animated
	let firstPage = $state(0);
	let secondPage = $state(1);

	// Flip State
	let flipDirection: 'left' | 'right' | null = $state(null);
	let flipProgress = $state(0);
	let flipFrontImage: string | null = $state(null);
	let flipBackImage: string | null = $state(null);
	let flipOpacity = $state(1);
	let flipAuto = $state(false); // Whether flip is auto-animating (Vue: flip.auto)

	// Zoom State
	let zoomIndex = $state(0);
	let zoom = $state(1);
	let zooming = $state(false);
	$effect(() => {
		zoom = zooms[0] || 1;
	});

	// Swipe/Touch State (Vue lines 202-206)
	let touchStartX: number | null = $state(null);
	let touchStartY: number | null = $state(null);
	let maxMove = $state(0);
	let activeCursor: string | null = $state(null);
	let hasTouchEvents = $state(false);
	let hasPointerEvents = $state(false);

	// View settings
	let container: HTMLElement | undefined = $state();
	let bookStage: HTMLElement | undefined = $state();
	let perspective = $state(2400);
	let viewWidth = $state(400);
	let viewHeight = $state(600);

	// Derived
	let pageWidth = $derived(viewWidth / displayedPages);
	let pageHeight = $derived(viewHeight);
	let xMargin = $derived(0);
	let yMargin = $derived(0);

	// Computed cursor
	let cursor = $derived.by(() => {
		if (activeCursor) return activeCursor;
		if (dragToFlip) return 'grab';
		return 'auto';
	});

	// For single-page mode, forward is always 'right' (flip to see next page)
	// forwardDirection is now a prop

	// Computed: canFlipLeft/canFlipRight based on forwardDirection (Vue lines 228-231)
	let canFlipLeft = $derived(forwardDirection === 'left' ? canGoForward() : canGoBack());
	let canFlipRight = $derived(forwardDirection === 'right' ? canGoForward() : canGoBack());

	// Resize Observer logic (Vue lines 370-380)
	onMount(() => {
		if (!container) return;
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const rect = entry.contentRect;
				viewWidth = rect.width;
				viewHeight = rect.height;

				// Update displayedPages based on aspect ratio
				const newDisplayedPages = viewWidth > viewHeight && !singlePage ? 2 : 1;
				if (newDisplayedPages !== displayedPages) {
					displayedPages = newDisplayedPages;
					// Vue line 377: Ensure even page start when switching to 2-page mode
					if (displayedPages === 2) {
						currentPage &= ~1;
					}
					fixFirstPage();
				}
			}
		});
		resizeObserver.observe(container);
		return () => resizeObserver.disconnect();
	});

	function fixFirstPage() {
		if (displayedPages === 1 && currentPage === 0 && pages.length && !pages[0]) {
			currentPage++;
		}
	}

	$effect(() => {
		if (startPage !== undefined && startPage !== currentPage) {
			currentPage = startPage;
			if (displayedPages === 2) {
				currentPage &= ~1; // Ensure even
			}
		}
	});

	function canGoForward(): boolean {
		return !flipDirection && currentPage < pages.length - displayedPages;
	}

	function canGoBack(): boolean {
		return (
			!flipDirection &&
			currentPage >= displayedPages &&
			!(displayedPages === 1 && !pages[firstPage - 1])
		);
	}

	// Vue lines 400-406: flipLeft and flipRight entry points
	function flipLeft() {
		if (!canFlipLeft) return;
		flipStart('left', true);
	}

	function flipRight() {
		if (!canFlipRight) return;
		flipStart('right', true);
	}

	// Vue lines 560-587: flipStart - unified flip initialization
	function flipStart(direction: 'left' | 'right', auto: boolean) {
		// Set up front/back images based on direction (Vue lines 561-574)
		if (direction !== forwardDirection) {
			// Backward flip (left for RTL=false)
			if (displayedPages === 1) {
				flipFrontImage = pages[currentPage - 1] ?? null;
				flipBackImage = null;
			} else {
				flipFrontImage = pages[firstPage] ?? null;
				flipBackImage = pages[currentPage - displayedPages + 1] ?? null;
			}
		} else {
			// Forward flip (right for RTL=false)
			if (displayedPages === 1) {
				flipFrontImage = pages[currentPage] ?? null;
				flipBackImage = null;
			} else {
				flipFrontImage = pages[secondPage] ?? null;
				flipBackImage = pages[currentPage + displayedPages] ?? null;
			}
		}

		flipDirection = direction;
		flipProgress = 0;
		flipOpacity = 1;

		// Vue lines 578-587: Delayed page index update
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (direction !== forwardDirection) {
					// Backward flip
					if (displayedPages === 2) {
						firstPage = currentPage - displayedPages;
						secondPage = currentPage - displayedPages + 1;
					}
				} else {
					// Forward flip
					if (displayedPages === 1) {
						firstPage = currentPage + displayedPages;
					} else {
						// For 2-page mode, we need to show the NEXT spread as background
						firstPage = currentPage + displayedPages;
						secondPage = currentPage + displayedPages + 1;
					}
				}
				if (auto) {
					flipAutoAnimate(true);
				}
			});
		});
	}

	// Vue lines 589-613: flipAutoAnimate - auto-complete the flip animation
	function flipAutoAnimate(ease: boolean) {
		const t0 = performance.now();
		const flipDuration = 800;
		const duration = flipDuration * (1 - flipProgress);
		const startRatio = flipProgress;
		flipAuto = true;

		function animate() {
			requestAnimationFrame(() => {
				const t = performance.now() - t0;
				let ratio = startRatio + t / duration;
				if (ratio > 1) ratio = 1;

				flipProgress = ease ? easeInOut(ratio) : ratio;

				// Vue lines 418-422: Opacity fade near the end
				if (displayedPages === 1 && flipProgress > 0.7) {
					flipOpacity = 1 - (flipProgress - 0.7) / 0.3;
				} else {
					flipOpacity = 1;
				}

				if (ratio < 1) {
					animate();
				} else {
					finishFlip();
				}
			});
		}
		animate();
	}

	// Vue lines 615-635: flipRevert - revert cancelled swipe
	function flipRevert() {
		const t0 = performance.now();
		const flipDuration = 800;
		const duration = flipDuration * flipProgress;
		const startRatio = flipProgress;
		flipAuto = true;

		function animate() {
			requestAnimationFrame(() => {
				const t = performance.now() - t0;
				let ratio = startRatio - (startRatio * t) / duration;
				if (ratio < 0) ratio = 0;

				flipProgress = ratio;

				if (ratio > 0) {
					animate();
				} else {
					// Reset page indices
					firstPage = currentPage;
					secondPage = currentPage + 1;

					// Clear flip state
					if (displayedPages === 1 && flipDirection !== forwardDirection) {
						flipDirection = null;
					} else {
						flipDirection = null;
					}
					flipAuto = false;
					flipFrontImage = null;
					flipBackImage = null;
					flipOpacity = 1;
				}
			});
		}
		animate();
	}

	function canZoomIn() {
		return !zooming && zoomIndex < zooms.length - 1;
	}

	function canZoomOut() {
		return !zooming && zoomIndex > 0;
	}

	function zoomIn(zoomAtPoint: { pageX: number; pageY: number } | null = null) {
		if (!canZoomIn()) return;
		zoomIndex += 1;
		zoomTo(zooms[zoomIndex], zoomAtPoint);
	}

	function zoomOut(zoomAtPoint: { pageX: number; pageY: number } | null = null) {
		if (!canZoomOut()) return;
		zoomIndex -= 1;
		zoomTo(zooms[zoomIndex], zoomAtPoint);
	}

	function zoomAt(touch: { pageX: number; pageY: number }) {
		zoomIndex = (zoomIndex + 1) % zooms.length;
		zoomTo(zooms[zoomIndex], touch);
	}

	function zoomTo(newZoom: number, zoomAtPoint: { pageX: number; pageY: number } | null = null) {
		if (!container) return;
		const t0 = performance.now();
		const start = zoom;
		const end = newZoom;
		zooming = true;

		function animate() {
			requestAnimationFrame(() => {
				const t = performance.now() - t0;
				let ratio = t / zoomDuration;
				if (ratio > 1) ratio = 1;
				ratio = easeInOut(ratio);
				zoom = start + (end - start) * ratio;
				if (t < zoomDuration) {
					animate();
				} else {
					zooming = false;
					zoom = end;
				}
			});
		}
		animate();
	}

	function easeInOut(x: number): number {
		if (x < 0.5) {
			return Math.pow(x * 2, 2) / 2;
		} else {
			return 0.5 + (1 - Math.pow((1 - x) * 2, 2)) / 2;
		}
	}

	function finishFlip() {
		// Update current page based on direction (Vue lines 603-606)
		if (flipDirection !== forwardDirection) {
			currentPage -= displayedPages;
		} else {
			currentPage += displayedPages;
		}

		// Clamp
		if (currentPage < 0) currentPage = 0;
		if (currentPage >= pages.length) currentPage = pages.length - 1;

		// Reset firstPage/secondPage
		firstPage = currentPage;
		secondPage = currentPage + 1;

		// Reset flip state (Vue lines 608-612)
		if (displayedPages === 1 && flipDirection === forwardDirection) {
			flipDirection = null;
		} else {
			flipDirection = null;
		}
		flipAuto = false;
		flipProgress = 0;
		flipFrontImage = null;
		flipBackImage = null;
		flipOpacity = 1;
	}

	// === SWIPE HANDLERS (Vue lines 707-788) ===

	// Vue lines 707-717: swipeStart
	function swipeStart(touch: { pageX: number; pageY: number }) {
		touchStartX = touch.pageX;
		touchStartY = touch.pageY;
		maxMove = 0;
		if (zoom <= 1) {
			if (dragToFlip) {
				activeCursor = 'grab';
			}
		} else {
			activeCursor = 'all-scroll';
		}
	}

	// Vue lines 719-743: swipeMove
	function swipeMove(touch: { pageX: number; pageY: number }): boolean {
		if (touchStartX === null) return false;

		const x = touch.pageX - touchStartX;
		const y = touch.pageY - touchStartY!;
		maxMove = Math.max(maxMove, Math.abs(x));
		maxMove = Math.max(maxMove, Math.abs(y));

		if (zoom > 1) {
			// Drag scroll not fully implemented, but prevent flip
			return false;
		}

		if (!dragToFlip) return false;
		// Ignore if vertical movement is greater
		if (Math.abs(y) > Math.abs(x)) return false;

		activeCursor = 'grabbing';

		if (x > 0) {
			// Swiping right -> flip left (go back)
			if (flipDirection === null && canFlipLeft && x >= swipeMin) {
				flipStart('left', false);
			}
			if (flipDirection === 'left') {
				flipProgress = x / pageWidth;
				if (flipProgress > 1) flipProgress = 1;
				// Update opacity for single page
				if (displayedPages === 1 && flipProgress > 0.7) {
					flipOpacity = 1 - (flipProgress - 0.7) / 0.3;
				}
			}
		} else {
			// Swiping left -> flip right (go forward)
			if (flipDirection === null && canFlipRight && x <= -swipeMin) {
				flipStart('right', false);
			}
			if (flipDirection === 'right') {
				flipProgress = -x / pageWidth;
				if (flipProgress > 1) flipProgress = 1;
				// Update opacity for single page
				if (displayedPages === 1 && flipProgress > 0.7) {
					flipOpacity = 1 - (flipProgress - 0.7) / 0.3;
				}
			}
		}
		return true;
	}

	// Vue lines 745-754: swipeEnd
	function swipeEnd() {
		if (touchStartX === null) return;

		if (clickToZoom && maxMove < swipeMin && !flipDirection) {
			if (touchStartX !== null && touchStartY !== null) {
				zoomAt({ pageX: touchStartX, pageY: touchStartY });
			}
		}

		if (flipDirection !== null && !flipAuto) {
			if (flipProgress > 0.25) {
				// Complete the flip
				flipAutoAnimate(false);
			} else {
				// Revert the flip
				flipRevert();
			}
		}
		touchStartX = null;
		activeCursor = null;
	}

	// === EVENT HANDLERS (Vue lines 756-789) ===

	function onTouchStart(ev: TouchEvent) {
		hasTouchEvents = true;
		swipeStart(ev.changedTouches[0]);
	}

	function onTouchMove(ev: TouchEvent) {
		if (swipeMove(ev.changedTouches[0])) {
			if (ev.cancelable) ev.preventDefault();
		}
	}

	function onTouchEnd(ev: TouchEvent) {
		swipeEnd();
	}

	function onPointerDown(ev: PointerEvent) {
		hasPointerEvents = true;
		if (hasTouchEvents) return;
		if (ev.button && ev.button !== 0) return; // Ignore right-click
		swipeStart(ev);
		try {
			(ev.target as HTMLElement).setPointerCapture(ev.pointerId);
		} catch {}
	}

	function onPointerMove(ev: PointerEvent) {
		if (!hasTouchEvents) swipeMove(ev);
	}

	function onPointerUp(ev: PointerEvent) {
		if (hasTouchEvents) return;
		swipeEnd();
		try {
			(ev.target as HTMLElement).releasePointerCapture(ev.pointerId);
		} catch {}
	}

	function onMouseDown(ev: MouseEvent) {
		if (hasTouchEvents || hasPointerEvents) return;
		if (ev.button && ev.button !== 0) return;
		swipeStart(ev);
	}

	function onMouseMove(ev: MouseEvent) {
		if (!hasTouchEvents && !hasPointerEvents) swipeMove(ev);
	}

	function onMouseUp(ev: MouseEvent) {
		if (!hasTouchEvents && !hasPointerEvents) swipeEnd();
	}

	// --- POLYGON MATH ---

	interface Polygon {
		key: string;
		bgImage: string | null;
		lighting: string;
		bgPos: string;
		transform: string;
		zIndex: number;
	}

	function makePolygonArray(face: 'front' | 'back'): Polygon[] {
		if (!flipDirection) return [];

		let progress = flipProgress;
		let direction: 'left' | 'right' = flipDirection;

		// Store original direction before any normalization (Vue lines 412)
		const originalDirection = flipDirection;

		// Vue lines 414-416: For single-page mode backward flip, invert progress
		if (displayedPages === 1 && direction !== forwardDirection) {
			progress = 1 - progress;
			direction = forwardDirection;
		}

		const image = face === 'front' ? flipFrontImage : flipBackImage;
		const polygonWidthPx = pageWidth / nPolygons;

		// Vue lines 432-460: Determine pageX and originRight based on displayedPages and direction
		let pageX = xMargin;
		let originRight = false;

		if (displayedPages === 1) {
			// Single-page mode (Vue lines 434-449)
			if (forwardDirection === 'right') {
				if (face === 'back') {
					originRight = true;
					pageX = xMargin - pageWidth;
				}
			} else {
				// forwardDirection === 'left'
				if (direction === 'left') {
					if (face === 'back') {
						pageX = pageWidth - xMargin;
					} else {
						originRight = true;
					}
				} else {
					if (face === 'front') {
						pageX = pageWidth - xMargin;
					} else {
						originRight = true;
					}
				}
			}
		} else {
			// Two-page mode (Vue lines 451-460)
			if (direction === 'left') {
				if (face === 'back') {
					pageX = viewWidth / 2;
				} else {
					originRight = true;
				}
			} else {
				if (face === 'front') {
					pageX = viewWidth / 2;
				} else {
					originRight = true;
				}
			}
		}

		// Build the page matrix with perspective
		const pageMatrix = new Matrix();
		pageMatrix.translate(viewWidth / 2, 0);
		pageMatrix.perspective(perspective);
		pageMatrix.translate(-viewWidth / 2, 0);
		pageMatrix.translate(pageX, yMargin);

		// Calculate page rotation (Vue lines 468-473)
		let pageRotation = 0;
		if (progress > 0.5) {
			pageRotation = -(progress - 0.5) * 2 * 180;
		}
		// Vue line 471-472: Flip rotation sign for left direction
		if (direction === 'left') {
			pageRotation = -pageRotation;
		}
		if (face === 'back') {
			pageRotation += 180;
		}

		// Apply rotation (Vue lines 475-478)
		if (pageRotation) {
			if (originRight) {
				pageMatrix.translate(pageWidth, 0);
			}
			pageMatrix.rotateY(pageRotation);
			if (originRight) {
				pageMatrix.translate(-pageWidth, 0);
			}
		}

		// Cylinder parameters
		let theta: number;
		if (progress < 0.5) {
			theta = progress * 2 * Math.PI;
		} else {
			theta = (1 - (progress - 0.5) * 2) * Math.PI;
		}
		if (theta === 0) theta = 1e-9;

		const radius = pageWidth / theta;

		let radian = 0;
		const dRadian = theta / nPolygons;
		let rotate = (dRadian / 2 / Math.PI) * 180;
		let dRotate = (dRadian / Math.PI) * 180;

		if (originRight) {
			rotate = (-theta / Math.PI) * 180 + dRotate / 2;
		}

		if (face === 'back') {
			rotate = -rotate;
			dRotate = -dRotate;
		}

		const polys: Polygon[] = [];

		for (let i = 0; i < nPolygons; i++) {
			const bgPos = `${(i / (nPolygons - 1)) * 100}% 0px`;

			const m = pageMatrix.clone();

			const rad = originRight ? theta - radian : radian;
			let x = Math.sin(rad) * radius;
			if (originRight) {
				x = pageWidth - x;
			}
			let z = (1 - Math.cos(rad)) * radius;
			if (face === 'back') {
				z = -z;
			}

			m.translate3d(x, 0, z);
			m.rotateY(-rotate);

			const lighting = computeLighting(pageRotation - rotate, dRotate);

			polys.push({
				key: face + i,
				bgImage: image,
				lighting,
				bgPos,
				transform: m.toString(),
				zIndex: Math.abs(Math.round(z))
			});

			radian += dRadian;
			rotate += dRotate;
		}

		return polys;
	}

	function computeLighting(rot: number, dRotate: number): string {
		const gradients: string[] = [];
		const lightingPoints = [-0.5, -0.25, 0, 0.25, 0.5];
		const ambient = 0.4;
		const gloss = 0.6;

		if (ambient < 1) {
			const blackness = 1 - ambient;
			const diffuse = lightingPoints.map((d) => {
				return (1 - Math.cos(((rot - dRotate * d) / 180) * Math.PI)) * blackness;
			});
			gradients.push(`linear-gradient(to right,
				rgba(0,0,0,${diffuse[0]}),
				rgba(0,0,0,${diffuse[1]}) 25%,
				rgba(0,0,0,${diffuse[2]}) 50%,
				rgba(0,0,0,${diffuse[3]}) 75%,
				rgba(0,0,0,${diffuse[4]}))`);
		}

		if (gloss > 0) {
			const DEG = 30;
			const POW = 200;
			const specular = lightingPoints.map((d) => {
				return Math.max(
					Math.pow(Math.cos(((rot + DEG - dRotate * d) / 180) * Math.PI), POW),
					Math.pow(Math.cos(((rot - DEG - dRotate * d) / 180) * Math.PI), POW)
				);
			});
			gradients.push(`linear-gradient(to right,
				rgba(255,255,255,${specular[0] * gloss}),
				rgba(255,255,255,${specular[1] * gloss}) 25%,
				rgba(255,255,255,${specular[2] * gloss}) 50%,
				rgba(255,255,255,${specular[3] * gloss}) 75%,
				rgba(255,255,255,${specular[4] * gloss}))`);
		}

		return gradients.join(',');
	}
</script>

<div class="flipbook-container" bind:this={container} style="--perspective: {perspective}px">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="book-stage"
		bind:this={bookStage}
		style:width="{viewWidth}px"
		style:height="{viewHeight}px"
		style:transform="scale({zoom})"
		style:cursor
		ontouchstart={onTouchStart}
		ontouchmove={onTouchMove}
		ontouchend={onTouchEnd}
		ontouchcancel={onTouchEnd}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		onmousedown={onMouseDown}
		onmousemove={onMouseMove}
		onmouseup={onMouseUp}
	>
		<!-- Click-to-flip zones (Vue lines 35-45) -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="click-to-flip left"
			style:cursor={canFlipLeft ? 'pointer' : 'auto'}
			onclick={flipLeft}
		></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="click-to-flip right"
			style:cursor={canFlipRight ? 'pointer' : 'auto'}
			onclick={flipRight}
		></div>

		<!-- 
			Background page logic (Updated for 2-page spread):
            If displayedPages == 1:
              - Show `firstPage` (which is same as `currentPage`) centrally
            If displayedPages == 2:
              - Based on forwardDirection (LTR vs RTL), decide which page is Left/Right.
              - LTR ('right'): Left=firstPage, Right=secondPage
              - RTL ('left'): Left=secondPage, Right=firstPage
		-->
		{#if displayedPages === 1}
			{#if pages[firstPage]}
				<div class="page-bg" style:left="0" style:width="{pageWidth}px">
					<img src={pages[firstPage]} alt="Page {firstPage + 1}" draggable="false" />
				</div>
			{/if}
		{:else}
			{@const leftPageIndex = forwardDirection === 'right' ? firstPage : secondPage}
			{@const rightPageIndex = forwardDirection === 'right' ? secondPage : firstPage}

			{#if pages[leftPageIndex]}
				<div class="page-bg" style:left="0" style:width="{pageWidth}px">
					<img src={pages[leftPageIndex]} alt="Page {leftPageIndex + 1}" draggable="false" />
				</div>
			{/if}
			{#if pages[rightPageIndex]}
				<div class="page-bg" style:left="{pageWidth}px" style:width="{pageWidth}px">
					<img src={pages[rightPageIndex]} alt="Page {rightPageIndex + 1}" draggable="false" />
				</div>
			{/if}
		{/if}

		<!-- Dynamic Flipping Polygons -->
		{#if flipDirection}
			<div class="flip-layer" style:opacity={flipOpacity}>
				{#each makePolygonArray('front') as poly (poly.key)}
					<div
						class="polygon"
						class:blank={!poly.bgImage}
						style:background-image={poly.bgImage ? `url(${poly.bgImage})` : 'none'}
						style:background-size="{pageWidth}px {pageHeight}px"
						style:background-position={poly.bgPos}
						style:width="{pageWidth / nPolygons}px"
						style:height="{pageHeight}px"
						style:transform={poly.transform}
						style:z-index={poly.zIndex}
					>
						{#if poly.lighting}
							<div class="lighting" style:background-image={poly.lighting}></div>
						{/if}
					</div>
				{/each}

				{#each makePolygonArray('back') as poly (poly.key)}
					<div
						class="polygon"
						class:blank={!poly.bgImage}
						style:background-image={poly.bgImage ? `url(${poly.bgImage})` : 'none'}
						style:background-size="{pageWidth}px {pageHeight}px"
						style:background-position={poly.bgPos}
						style:width="{pageWidth / nPolygons}px"
						style:height="{pageHeight}px"
						style:transform={poly.transform}
						style:z-index={poly.zIndex}
					>
						{#if poly.lighting}
							<div class="lighting" style:background-image={poly.lighting}></div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="controls">
		<button onclick={flipLeft} disabled={!canFlipLeft}>← Prev</button>
		<span class="info">{currentPage + 1} / {pages.length}</span>
		<button onclick={flipRight} disabled={!canFlipRight}>Next →</button>
	</div>
</div>

<style>
	.flipbook-container {
		width: 100%;
		height: 100%;
		perspective: var(--perspective);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #2a2a2a;
		overflow: hidden;
	}

	.book-stage {
		position: relative;
		transform-style: preserve-3d;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		user-select: none;
	}

	/* Click-to-flip zones (Vue lines 914-928) */
	.click-to-flip {
		position: absolute;
		width: 50%;
		height: 100%;
		top: 0;
		user-select: none;
		z-index: 5;
	}

	.click-to-flip.left {
		left: 0;
	}

	.click-to-flip.right {
		right: 0;
	}

	.page-bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: white;
		z-index: 0;
	}

	.page-bg img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.flip-layer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		pointer-events: none;
		z-index: 10;
	}

	.polygon {
		position: absolute;
		top: 0;
		left: 0;
		backface-visibility: hidden;
		transform-origin: left center;
		background-color: white;
	}

	.polygon.blank {
		background-color: #f5f5f5;
	}

	.lighting {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.controls {
		margin-top: 20px;
		z-index: 100;
		padding: 12px 24px;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 12px;
		display: flex;
		gap: 20px;
		align-items: center;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.controls button {
		padding: 10px 20px;
		border: none;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.controls button:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.controls button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.info {
		font-size: 16px;
		color: #333;
		min-width: 80px;
		text-align: center;
		font-weight: 500;
	}
</style>
