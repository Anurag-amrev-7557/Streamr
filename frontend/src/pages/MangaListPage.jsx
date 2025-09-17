import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import comickService from '../services/comickService'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import EnhancedSearchBar from '../components/EnhancedSearchBar'
import EnhancedLoadingSpinner, { SectionLoader } from '../components/enhanced/EnhancedLoadingSpinner'
import EnhancedLoadingIndicator from '../components/EnhancedLoadingIndicator'


// Optimized image with blur-up, async decoding, and responsive sizes
const OptimizedImage = ({ src, alt, className, sizes, width = 400, height = 600, priority = false }) => {
	const [isLoaded, setIsLoaded] = useState(false)
	if (!src) {
		return (
			<div className={`absolute inset-0 flex items-center justify-center text-white/40 text-xs ${className || ''}`}>No Image</div>
		)
	}
	return (
		<img
			src={src}
			alt={alt}
			loading={priority ? 'eager' : 'lazy'}
			decoding="async"
			fetchpriority={priority ? 'high' : 'auto'}
			sizes={sizes}
			width={width}
			height={height}
			className={`absolute inset-0 w-full h-full object-cover transition duration-300 ${isLoaded ? 'blur-0 opacity-100' : 'blur-sm opacity-80'} ${className || ''}`}
			onLoad={() => setIsLoaded(true)}
		/>
	)
}

const MangaCardComponent = ({ item, onClick, priority = false }) => {
	const cover = useMemo(() => {
		const b2key = item?.comic?.md_covers?.[0]?.b2key || item?.md_covers?.[0]?.b2key || item?.cover?.b2key || item?.md_covers?.b2key;
		if (!b2key) return null;
		// Comick cover CDN pattern
		return `https://meo.comick.pictures/${b2key}`;
	}, [item]);
	const title = item?.title || item?.comic?.title || 'Untitled';
	return (
		<button onClick={onClick} className="group w-full text-left rounded-lg overflow-hidden bg-[#0f1216] hover:bg-[#14181d] transition-colors shadow-lg" style={{ contentVisibility: 'auto', containIntrinsicSize: '300px 450px' }}>
			<div className="relative w-full bg-[#0b0f14]">
				<div className="aspect-[2/3] w-full"></div>
				<OptimizedImage
					src={cover}
					alt={title}
					priority={priority}
					sizes="(min-width:1536px) 10vw, (min-width:1280px) 12vw, (min-width:1024px) 16vw, (min-width:768px) 20vw, (min-width:640px) 30vw, 45vw"
				/>
			</div>
			<div className="p-2.5">
				<div className="text-white text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">{title}</div>
				<div className="text-[11px] text-gray-400 mt-1 line-clamp-1">{item?.comic?.slug || item?.slug}</div>
			</div>
		</button>
	);
};

const MangaCard = React.memo(MangaCardComponent)

const MangaListPage = () => {
	const PAGE_SIZE = 20
	const navigate = useNavigate()
	const [items, setItems] = useState([])
	const [trending, setTrending] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [retryCount, setRetryCount] = useState(0)
	const [query, setQuery] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [dataSource, setDataSource] = useState('trending')
	const [currentQuery, setCurrentQuery] = useState('')
	const inputRef = useRef(null)
	const dropdownRef = useRef(null)
	const sentinelRef = useRef(null)
	const [isFocused, setIsFocused] = useState(false)
	const [history, setHistory] = useState([])
	const [activeIndex, setActiveIndex] = useState(-1)
	const [serverSugg, setServerSugg] = useState([])
	
	// FIXED: Add mounted ref and cleanup refs for memory leak prevention
	const isMountedRef = useRef(true)
	const intersectionObserverRef = useRef(null)
	const searchTimeoutRef = useRef(null)
	const suggestionTimeoutRef = useRef(null)
	const prefetchTimeoutRef = useRef(null)

	// FIXED: Enhanced cleanup on unmount to prevent memory leaks
	useEffect(() => {
		isMountedRef.current = true
		
		return () => {
			isMountedRef.current = false
			
			// Clear all timeouts
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
				searchTimeoutRef.current = null
			}
			if (suggestionTimeoutRef.current) {
				clearTimeout(suggestionTimeoutRef.current)
				suggestionTimeoutRef.current = null
			}
			if (prefetchTimeoutRef.current) {
				clearTimeout(prefetchTimeoutRef.current)
				prefetchTimeoutRef.current = null
			}
			
			// Disconnect intersection observer
			if (intersectionObserverRef.current) {
				intersectionObserverRef.current.disconnect()
				intersectionObserverRef.current = null
			}
		}
	}, [])

	// Preconnect to image CDN for faster TLS and DNS
	useEffect(() => {
		try {
			const href = 'https://meo.comick.pictures'
			const existing = document.querySelector(`link[rel="preconnect"][href="${href}"]`)
			if (!existing) {
				const link = document.createElement('link')
				link.rel = 'preconnect'
				link.href = href
				link.crossOrigin = ''
				document.head.appendChild(link)
			}
		} catch {}
	}, [])

	// Load history from localStorage
	useEffect(() => {
		try {
			const raw = localStorage.getItem('manga.search.history')
			if (raw) setHistory(JSON.parse(raw))
		} catch {}
	}, [])

	const persistHistory = useCallback((arr) => {
		try { localStorage.setItem('manga.search.history', JSON.stringify(arr)) } catch {}
	}, [])

	const addToHistory = useCallback((term) => {
		const t = (term || '').trim()
		if (!t) return
		setHistory(prev => {
			const set = new Set([t, ...prev])
			const next = Array.from(set).slice(0, 8)
			persistHistory(next)
			return next
		})
	}, [persistHistory])

	const clearHistory = useCallback(() => {
		setHistory([])
		persistHistory([])
	}, [persistHistory])

	// Global shortcut: '/' focuses the search
	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === '/' && !e.defaultPrevented) {
				e.preventDefault()
				inputRef.current?.focus()
				setIsFocused(true)
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	const fetchTrending = useCallback(() => {
		if (!isMountedRef.current) return
		
		setLoading(true)
		setError('')
		// Check if component is still mounted before making request
		if (!isMountedRef.current) return
		
		comickService.getTop({ type: 'trending', comic_types: ['manga'], accept_mature_content: false })
			.then(data => {
				if (!isMountedRef.current) return
				console.debug('[MangaListPage] /top response raw:', data)
				let list = Array.isArray(data) ? data : (data?.comics || data?.top || data?.data || data?.rows || [])
				console.debug('[MangaListPage] normalized list length:', list.length)
				if (list.length === 0) {
					return comickService.search({ sort: 'view', limit: PAGE_SIZE, country: ['jp'], content_rating: 'safe', showall: false }).then(sr => {
						if (!isMountedRef.current) return
						const sList = Array.isArray(sr) ? sr : (sr?.comics || sr?.data || sr?.results || sr?.result || [])
						console.debug('[MangaListPage] fallback search length:', sList.length)
						setItems(sList)
						setTrending(sList)
						setDataSource('trending')
						setPage(1)
						setHasMore(sList.length >= PAGE_SIZE)
					})
				}
				setItems(list)
				setTrending(list)
				setDataSource('trending')
				setPage(1)
				setHasMore(list.length >= PAGE_SIZE)
			})
			.catch(err => {
				if (!isMountedRef.current) return
				
				// Handle specific error cases
				let errorMessage = 'Failed to load manga'
				
				if (err.name === 'AbortError') {
					errorMessage = 'Request was cancelled. Please try again.'
				} else if (err.message && err.message.includes('signal is aborted')) {
					errorMessage = 'Request was cancelled. Please try again.'
				} else if (err.message && err.message.includes('Component unmounted')) {
					// Don't show error if component was unmounted
					return
				} else {
					errorMessage = err.message || 'Failed to load manga'
				}
				
				setError(errorMessage)
			})
			.finally(() => {
				if (isMountedRef.current) {
					setLoading(false)
				}
			})
	}, [])

	useEffect(() => {
		const cleanup = fetchTrending()
		return cleanup
	}, [fetchTrending])

	const handleRetry = useCallback(async () => {
		setRetryCount(c => c + 1)
		await fetchTrending()
	}, [fetchTrending])

	// FIXED: Debounced search with pagination reset and infinite loop prevention
	useEffect(() => {
		if (!isMountedRef.current) return
		
		const resetToTrending = () => {
			if (!isMountedRef.current) return
			setIsSearching(false)
			setItems(trending)
			setDataSource('trending')
			setPage(1)
			setHasMore(true)
			setCurrentQuery('')
		}
		const qRaw = query || ''
		if (!qRaw.trim()) { resetToTrending(); return }
		setIsSearching(true)
		
		// FIXED: Clear previous timeout
		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current)
		}
		
		searchTimeoutRef.current = setTimeout(async () => {
			if (!isMountedRef.current) return
			
			const q = qRaw.trim()
			try {
				// Check if component is still mounted before making request
				if (!isMountedRef.current) return
				
				const sr = await comickService.search({ q, page: 1, limit: PAGE_SIZE, content_rating: 'safe', showall: true, type: 'comic' })
				if (!isMountedRef.current) return
				const sList = Array.isArray(sr) ? sr : (sr?.results || sr?.result || sr?.data || sr?.comics || [])
				setItems(sList)
				setDataSource('search')
				setPage(1)
				setHasMore((sList?.length || 0) >= PAGE_SIZE)
				setCurrentQuery(q)
				addToHistory(q)
			} catch (err) {
				if (!isMountedRef.current) return
				
				// Handle specific error cases
				let errorMessage = 'Search failed'
				
				if (err.name === 'AbortError') {
					errorMessage = 'Search was cancelled. Please try again.'
				} else if (err.message && err.message.includes('signal is aborted')) {
					errorMessage = 'Search was cancelled. Please try again.'
				} else if (err.message && err.message.includes('Component unmounted')) {
					// Don't show error if component was unmounted
					return
				} else {
					errorMessage = err.message || 'Search failed'
				}
				
				setError(errorMessage)
			} finally {
				if (isMountedRef.current) {
					setIsSearching(false)
				}
			}
		}, 250)
		
		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current)
				searchTimeoutRef.current = null
			}
		}
	}, [query, trending, addToHistory])

	// Suggestions: combine from history, server, and trending/items
	const suggestionItems = useMemo(() => {
		const q = (query || '').trim().toLowerCase()
		const hist = history
			.filter(h => !q || h.toLowerCase().includes(q))
			.map(h => ({ type: 'history', label: h, value: h }))
			.slice(0, 5)
		const pool = (trending.length ? trending : items)
		const suggLocal = pool
			.map(it => it?.title || it?.comic?.title || '')
			.filter(Boolean)
			.map(t => ({ type: 'suggestion', label: t, value: t }))
		const seen = new Set()
		const merged = []
		for (const it of [...hist, ...serverSugg, ...suggLocal]) {
			const key = it.value.toLowerCase()
			if (seen.has(key)) continue
			seen.add(key)
			if (!q || key.includes(q)) merged.push(it)
			if (merged.length >= 12) break
		}
		return merged
	}, [history, trending, items, query, serverSugg])

	// FIXED: Server-side suggestions with debounce & cancellation and memory leak prevention
	useEffect(() => {
		if (!isMountedRef.current) return
		
		const q = (query || '').trim()
		if (q.length < 2) { 
			if (isMountedRef.current) {
				setServerSugg([])
			}
			return 
		}
		
		// FIXED: Clear previous timeout
		if (suggestionTimeoutRef.current) {
			clearTimeout(suggestionTimeoutRef.current)
		}
		
		suggestionTimeoutRef.current = setTimeout(async () => {
			if (!isMountedRef.current) return
			
			try {
				const titles = await comickService.getTitleSuggestions(q, { limit: 10 })
				if (!isMountedRef.current) return
				const server = (titles || []).map(t => ({ type: 'server', label: t, value: t }))
				setServerSugg(server)
			} catch (e) {
				// ignore
			}
		}, 250)
		
		return () => {
			if (suggestionTimeoutRef.current) {
				clearTimeout(suggestionTimeoutRef.current)
				suggestionTimeoutRef.current = null
			}
		}
	}, [query])

	// Close dropdown on outside click
	useEffect(() => {
		const onDocClick = (e) => {
			if (!dropdownRef.current || !inputRef.current) return
			if (dropdownRef.current.contains(e.target)) return
			if (inputRef.current.contains(e.target)) return
			setIsFocused(false)
		}
		document.addEventListener('mousedown', onDocClick)
		return () => document.removeEventListener('mousedown', onDocClick)
	}, [])

	const onInputKeyDown = useCallback((e) => {
		if (!isFocused) return
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			setActiveIndex(i => Math.min(i + 1, suggestionItems.length - 1))
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			setActiveIndex(i => Math.max(i - 1, -1))
		} else if (e.key === 'Enter') {
			if (activeIndex >= 0 && suggestionItems[activeIndex]) {
				e.preventDefault()
				const val = suggestionItems[activeIndex].value
				setQuery(val)
				addToHistory(val)
				setIsFocused(false)
			}
		} else if (e.key === 'Escape') {
			setIsFocused(false)
		}
	}, [isFocused, activeIndex, suggestionItems, addToHistory])

	const appendUnique = useCallback((prev, next) => {
		const seen = new Set(prev.map(it => (it?.hid || it?.slug || it?.comic?.hid || it?.comic?.slug)))
		const merged = [...prev]
		for (const it of next) {
			const key = it?.hid || it?.slug || it?.comic?.hid || it?.comic?.slug
			if (key && !seen.has(key)) {
				seen.add(key)
				merged.push(it)
			}
		}
		return merged
	}, [])

	const loadMore = useCallback(async () => {
		if (isLoadingMore || !hasMore) return
		setIsLoadingMore(true)
		try {
			// Check if component is still mounted before making request
			if (!isMountedRef.current) return
			
			let resp
			const nextPage = page + 1
			if (dataSource === 'search') {
				resp = await comickService.search({ q: currentQuery, page: nextPage, limit: PAGE_SIZE, content_rating: 'safe', showall: true, type: 'comic' })
			} else {
				resp = await comickService.search({ sort: 'view', page: nextPage, limit: PAGE_SIZE, country: ['jp'], content_rating: 'safe', showall: false, type: 'comic' })
			}
			const list = Array.isArray(resp) ? resp : (resp?.results || resp?.result || resp?.data || resp?.comics || [])
			setItems(prev => appendUnique(prev, list))
			setPage(nextPage)
			setHasMore((list?.length || 0) >= PAGE_SIZE)
		} catch (e) {
			// Handle specific error cases for load more
			if (e.name === 'AbortError' || (e.message && e.message.includes('signal is aborted'))) {
				// Don't show error for cancelled requests, just stop loading more
				console.log('Load more request was cancelled')
			} else if (e.message && e.message.includes('Component unmounted')) {
				// Don't show error if component was unmounted
				return
			} else {
				// For other errors, show a subtle error message
				console.warn('Failed to load more manga:', e.message)
			}
			setHasMore(false)
		} finally {
			setIsLoadingMore(false)
		}
	}, [isLoadingMore, hasMore, page, dataSource, currentQuery, appendUnique])

	// FIXED: Intersection observer with memory leak prevention
	useEffect(() => {
		const el = sentinelRef.current
		if (!el || !isMountedRef.current) return
		
		// FIXED: Disconnect previous observer
		if (intersectionObserverRef.current) {
			intersectionObserverRef.current.disconnect()
		}
		
		const io = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && isMountedRef.current) {
					loadMore()
				}
			}
		}, { root: null, rootMargin: '600px', threshold: 0 })
		
		intersectionObserverRef.current = io
		io.observe(el)
		
		// If sentinel is already within viewport (e.g., short list), trigger immediately
		try {
			const rect = el.getBoundingClientRect()
			if (rect.top <= (window.innerHeight + 600) && isMountedRef.current) {
				loadMore()
			}
		} catch {}
		
		return () => { 
			try { 
				if (intersectionObserverRef.current) {
					intersectionObserverRef.current.disconnect()
					intersectionObserverRef.current = null
				}
			} catch {} 
		}
	}, [loadMore, items.length, hasMore])

	// FIXED: Idle-time prefetch with memory leak prevention
	useEffect(() => {
		if (!items || items.length === 0 || !isMountedRef.current) return
		if (query && query.trim().length > 0) return // still fine, but avoid extra work during active typing
		
		// FIXED: Clear previous timeout
		if (prefetchTimeoutRef.current) {
			clearTimeout(prefetchTimeoutRef.current)
		}
		
		const schedule = (cb) => {
			if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
				window.requestIdleCallback(() => { 
					if (isMountedRef.current) cb() 
				}, { timeout: 1200 })
			} else {
				prefetchTimeoutRef.current = setTimeout(() => { 
					if (isMountedRef.current) cb() 
				}, 300)
			}
		}
		
		schedule(async () => {
			if (!isMountedRef.current) return
			
			try {
				const head = items.slice(0, 6)
				await Promise.all(head.map(it => {
					const slug = it?.comic?.slug || it?.slug || it?.hid
					if (!slug || !isMountedRef.current) return Promise.resolve()
					return comickService.getComicInfo(slug, { version: 'v1.0' }).catch(() => {})
				}))
			} catch {}
		})
		
		return () => {
			if (prefetchTimeoutRef.current) {
				clearTimeout(prefetchTimeoutRef.current)
				prefetchTimeoutRef.current = null
			}
		}
	}, [items, query])

	return (
		<div className="min-h-screen px-4 py-4">
			<div className="max-w-2xl mx-auto">
				<div className="mt-3 mb-6 md:mt-4 md:mb-8">
					<EnhancedSearchBar
						placeholder="Search manga titles…"
						onSearch={(q) => setQuery(q)}
						onSearchSubmit={(q) => addToHistory(q)}
						onClear={() => { setQuery(''); setItems(trending) }}
						suggestions={suggestionItems.map(s => ({ id: s.value, title: s.label }))}
						onSuggestionSelect={(s) => { const t = s?.title || ''; if (t) { setQuery(t); addToHistory(t); } }}
						isLoading={isSearching}
						showHistory={true}
						searchHistory={history}
						clearHistory={clearHistory}
						variant="default"
						size="md"
						theme="dark"
					/>
					{isSearching && (
						<div className="my-2 mt-6 flex items-center justify-center">
							<EnhancedLoadingSpinner size="sm" color="white" variant="dots" />
							<span className="ml-2 text-xs text-gray-400">Searching…</span>
						</div>
					)}
				</div>
			</div>
			{error ? (
				<EnhancedLoadingIndicator
					isLoading={false}
					error={error}
					retryCount={retryCount}
					onRetry={handleRetry}
					context="manga"
					className="col-span-full"
				/>
			) : (loading && items.length === 0) ? (
				<EnhancedLoadingIndicator
					isLoading={true}
					error={null}
					retryCount={retryCount}
					onRetry={handleRetry}
					context="manga"
					className="col-span-full"
					hasContent={items.length > 0}
				/>
			) : (
				<div>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-4">
						{items.map((item, idx) => (
							<MangaCard key={item?.hid || item?.slug || idx} item={item} priority={idx < 12} onClick={() => {
								const slug = item?.comic?.slug || item?.slug || item?.hid || item?.comic?.hid
								if (slug) navigate(`/manga/${encodeURIComponent(slug)}`)
							}} />
						))}
					</div>
					<div ref={sentinelRef} className="h-6" />
					{isLoadingMore && (
						<div className="mt-4 mb-6 flex items-center justify-center text-gray-400">
							<EnhancedLoadingSpinner size="sm" color="white" variant="dots" />
							<span className="ml-2 text-xs">Loading more…</span>
						</div>
					)}
					{!hasMore && items.length > 0 && (
						<div className="mt-6 mb-8 text-center text-xs text-gray-500">No more results</div>
					)}
				</div>
			)}
		</div>
	)
}

// Memoize the component to prevent unnecessary re-renders
const MemoizedMangaListPage = React.memo(MangaListPage, (prevProps, nextProps) => {
	// Only re-render if essential props change
	return true // No props to compare, so always return true to prevent re-renders
});

export default MemoizedMangaListPage
