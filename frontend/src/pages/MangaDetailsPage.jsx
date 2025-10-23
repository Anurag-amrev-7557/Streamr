import React, { useEffect, useMemo, useState, useCallback } from 'react'
import jikanService from '../services/jikanService'
import mangadexService from '../services/mangadexService'
import { useParams, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EnhancedLoadingIndicator from '../components/EnhancedLoadingIndicator'

// Language code to human-readable label mapping
const LANGUAGE_LABELS = {
	'en': 'English',
	'ja': 'Japanese',
	'jp': 'Japanese',
	'ko': 'Korean',
	'zh': 'Chinese',
	'zh-hans': 'Chinese (Simplified)',
	'zh-hant': 'Chinese (Traditional)',
	'es': 'Spanish',
	'es-419': 'Spanish (Latin America)',
	'pt': 'Portuguese',
	'pt-br': 'Portuguese (Brazil)',
	'fr': 'French',
	'de': 'German',
	'it': 'Italian',
	'ru': 'Russian',
	'vi': 'Vietnamese',
	'id': 'Indonesian',
	'th': 'Thai',
	'hi': 'Hindi',
	'ar': 'Arabic',
	'tr': 'Turkish',
	'pl': 'Polish',
	'nl': 'Dutch',
	'uk': 'Ukrainian',
	'he': 'Hebrew',
	'fa': 'Persian',
	'cs': 'Czech',
	'ro': 'Romanian',
	'hu': 'Hungarian',
	'sv': 'Swedish',
	'fi': 'Finnish',
	'no': 'Norwegian',
	'da': 'Danish',
}

const getLanguageLabel = (code) => {
	if (!code) return ''
	const lower = String(code).toLowerCase()
	if (LANGUAGE_LABELS[lower]) return LANGUAGE_LABELS[lower]
	// Fallback: Title Case unknown codes, keep dashes
	return lower.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-')
}

const ChapterRow = React.memo(({ ch, onRead, isRead = false, isBookmarked = false, onBookmark }) => {
	const handleRead = useCallback(() => {
		onRead?.()
	}, [onRead])

	const handleBookmark = useCallback((e) => {
		e.stopPropagation()
		e.preventDefault()
		onBookmark?.(ch)
	}, [onBookmark, ch])

	const chapterTitle = useMemo(() => {
		return ch?.chap || ch?.vol ? `Vol ${ch?.vol || ''} Ch ${ch?.chap || ''}` : ch?.title || 'Chapter'
	}, [ch?.chap, ch?.vol, ch?.title])

	const languageLabel = useMemo(() => {
		return getLanguageLabel(ch?.lang || ch?.language || '')
	}, [ch?.lang, ch?.language])

	const showSubtitle = ch?.title && ch?.title !== ch?.chap

	return (
		<div 
			className={`w-full flex items-center border border-white/10 justify-between px-3 py-2 rounded-full transition-all duration-200 active:scale-[0.99] ${
				isRead 
					? 'bg-[#1a1f24] hover:bg-[#20262b] text-gray-400' 
					: 'bg-[#181c20] hover:bg-[#20262b] text-gray-200'
			}`}
		>
			<div 
				onClick={handleRead}
				className="flex items-center space-x-3 flex-1 text-left rounded-lg p-1 -m-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
			>
				<div className="flex items-center space-x-2">
					{isRead && (
						<div className="w-2 h-2 bg-green-500 rounded-full" />
					)}
					<span className="text-sm font-medium">
						{chapterTitle}
					</span>
				</div>
				{showSubtitle && (
					<span className="text-xs text-gray-400 truncate max-w-32">
						{ch.title}
					</span>
				)}
			</div>
			<div className="flex items-center space-x-2">
				<span className="text-gray-500 text-xs">{languageLabel}</span>
				<button
					onClick={handleBookmark}
					className="p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
					aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
				>
					<svg 
						className={`w-4 h-4 ${isBookmarked ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
					</svg>
				</button>
			</div>
		</div>
	)
})

const MangaDetailsPage = () => {
	const { slug } = useParams()
	const navigate = useNavigate()
	const [info, setInfo] = useState(null)
	const [chapters, setChapters] = useState([])
	const [allChaptersMeta, setAllChaptersMeta] = useState([])
	const [loadingAllVolumes, setLoadingAllVolumes] = useState(false)
	const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0, currentLang: '' })
	const [availableLangs, setAvailableLangs] = useState([])
	const [chaptersRetryCount, setChaptersRetryCount] = useState(0)
	const [selectedLang, setSelectedLang] = useState(() => {
		try {
			return localStorage.getItem('manga.selectedLang') || ''
		} catch {
			return ''
		}
	})
	
	// Enhanced filter persistence
	const [chapterSearch, setChapterSearch] = useState(() => {
		try {
			return localStorage.getItem('manga.chapterSearch') || ''
		} catch {
			return ''
		}
	})
	
	// Debounced search for better performance
	const [debouncedSearch, setDebouncedSearch] = useState(chapterSearch)
	
	const [sortOrder, setSortOrder] = useState(() => {
		try {
			return localStorage.getItem('manga.sortOrder') || 'desc'
		} catch {
			return 'desc'
		}
	})
	
	const [showOnlyUnread, setShowOnlyUnread] = useState(() => {
		try {
			return localStorage.getItem('manga.showOnlyUnread') === 'true'
		} catch {
			return false
		}
	})
	
	const [selectedVolume, setSelectedVolume] = useState(() => {
		try {
			return localStorage.getItem('manga.selectedVolume') || ''
		} catch {
			return ''
		}
	})
	
	const [selectedChapter, setSelectedChapter] = useState(() => {
		try {
			return localStorage.getItem('manga.selectedChapter') || ''
		} catch {
			return ''
		}
	})
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [loadingChapters, setLoadingChapters] = useState(false)
	const [comicHid, setComicHid] = useState(null)
	const [availableVolumes, setAvailableVolumes] = useState([])
	const [availableChapters, setAvailableChapters] = useState([])
	const [isFilterFocus, setIsFilterFocus] = useState(false)
	const filtersRef = useRef(null)
	const [visibleChaptersCount, setVisibleChaptersCount] = useState(100)
	const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(() => {
		try {
			return localStorage.getItem('manga.isFiltersCollapsed') === 'true'
		} catch {
			return false
		}
	})
	
	// Cache for API requests to avoid redundant calls
	const [requestCache, setRequestCache] = useState(new Map())
	
	// Enhanced features state with persistence
	const [readingProgress, setReadingProgress] = useState(() => {
		try {
			const saved = localStorage.getItem('manga.readingProgress')
			return saved ? JSON.parse(saved) : {}
		} catch {
			return {}
		}
	})
	
	const [bookmarks, setBookmarks] = useState(() => {
		try {
			const saved = localStorage.getItem('manga.bookmarks')
			return saved ? new Set(JSON.parse(saved)) : new Set()
		} catch {
			return new Set()
		}
	})
	const [rating, setRating] = useState(0)
	const [userRating, setUserRating] = useState(0)
	const [showCoverGallery, setShowCoverGallery] = useState(false)
	const [mangaRating, setMangaRating] = useState(null)
	const [debugCounts, setDebugCounts] = useState(null)
	
	// FIXED: Add mounted ref and cleanup refs for memory leak prevention
	const isMountedRef = useRef(true)
	const prefetchTimeoutRef = useRef(null)

	const cover = useMemo(() => {
		const ji = info?.images || info?.image || null
		const url = ji?.jpg?.large_image_url || ji?.jpg?.image_url || ji?.webp?.large_image_url || ji?.webp?.image_url
		return url || null
	}, [info])

	// Enhanced utility functions
	const getCovers = useMemo(() => {
		const ji = info?.images || null
		const primary = ji?.jpg?.large_image_url || ji?.jpg?.image_url || ji?.webp?.large_image_url || ji?.webp?.image_url
		return primary ? [{ url: primary, volume: 'Main', description: '' }] : []
	}, [info])

	const getGenres = useMemo(() => {
		return info?.genres || []
	}, [info])

	const getAuthors = useMemo(() => {
		return info?.authors || []
	}, [info])

	const getStatus = useMemo(() => {
		return info?.status || 'Unknown'
	}, [info])

	const getPublicationInfo = useMemo(() => {
		return {
			year: info?.published?.prop?.from?.year || info?.year,
			country: null,
			contentRating: info?.rating || null
		}
	}, [info])

	// Additional stats utility functions
	const getChapterCount = useMemo(() => {
		return allChaptersMeta.length || chapters.length || 0
	}, [allChaptersMeta.length, chapters.length])

	const getViewCount = useMemo(() => 0, [])

	const getFollowCount = useMemo(() => 0, [])

	const getCommentCount = useMemo(() => 0, [])

	const getLastUpdated = useMemo(() => {
		const lastUpdate = info?.published?.to || info?.published?.from
		if (!lastUpdate) return null
		try { const date = new Date(lastUpdate); return isNaN(date.getTime()) ? null : date } catch { return null }
	}, [info])

	const getDemographic = useMemo(() => {
		return info?.demographic || info?.comic?.demographic || null
	}, [info])

	const getContentRating = useMemo(() => {
		const rating = info?.content_rating || info?.comic?.content_rating
		if (!rating) return null
		
		// Map numeric content ratings to readable text
		const ratingMap = {
			1: 'Safe',
			2: 'Suggestive', 
			3: 'Erotica',
			4: 'Pornographic'
		}
		
		return ratingMap[rating] || rating
	}, [info])

	const getLanguage = useMemo(() => 'Unknown', [])

	const getPublisher = useMemo(() => null, [])

	const getSerialization = useMemo(() => null, [])

	// Function to truncate description after "---"
	const getTruncatedDescription = useMemo(() => {
		const fullDescription = info?.synopsis || 'No description available.'
		const separatorIndex = fullDescription.indexOf('---')
		return separatorIndex !== -1 ? fullDescription.substring(0, separatorIndex).trim() : fullDescription
	}, [info])

	// Reading progress and bookmark functions - memoized for performance
	const markChapterAsRead = useCallback((chapterId) => {
		setReadingProgress(prev => ({
			...prev,
			[chapterId]: { read: true, timestamp: Date.now() }
		}))
	}, [])

	const toggleBookmark = useCallback((chapter) => {
		const chapterId = chapter?.hid || chapter?.id
		setBookmarks(prev => {
			const newBookmarks = new Set(prev)
			if (newBookmarks.has(chapterId)) {
				newBookmarks.delete(chapterId)
			} else {
				newBookmarks.add(chapterId)
			}
			return newBookmarks
		})
	}, [])

	const isChapterRead = useCallback((chapter) => {
		const chapterId = chapter?.hid || chapter?.id
		return readingProgress[chapterId]?.read || false
	}, [readingProgress])

	const isChapterBookmarked = useCallback((chapter) => {
		const chapterId = chapter?.hid || chapter?.id
		return bookmarks.has(chapterId)
	}, [bookmarks])

	// Clear all filters function - memoized
	const clearAllFilters = useCallback(() => {
		setSelectedLang('')
		setChapterSearch('')
		setSortOrder('desc')
		setShowOnlyUnread(false)
		setSelectedVolume('')
		setSelectedChapter('')
	}, [])

	// Check if any filters are active
	const hasActiveFilters = useMemo(() => {
		return selectedLang || chapterSearch || showOnlyUnread || selectedVolume || selectedChapter || sortOrder !== 'desc'
	}, [selectedLang, chapterSearch, showOnlyUnread, selectedVolume, selectedChapter, sortOrder])

	// FIXED: Enhanced cleanup on unmount to prevent memory leaks
	useEffect(() => {
		isMountedRef.current = true
		
		return () => {
			isMountedRef.current = false
			
			// Clear prefetch timeout
			if (prefetchTimeoutRef.current) {
				clearTimeout(prefetchTimeoutRef.current)
				prefetchTimeoutRef.current = null
			}
		}
	}, [])

	// FIXED: Load comic info once with memory leak prevention
	useEffect(() => {
		if (!isMountedRef.current) return
		
		setLoading(true)
		setError('')
		setChapters([])
		setSelectedVolume('')
		setSelectedChapter('')
		
		Promise.resolve()
			.then(async () => {
				if (!isMountedRef.current) return
				const malId = slug
				const ji = await jikanService.getMangaFullById(malId).catch(() => jikanService.getMangaById(malId))
				const data = ji?.data || ji || null
				setInfo(data)
				// Map to MangaDex manga id via title search
				let mdId = null
				try {
					// Try multiple titles from Jikan
					const titleCandidates = []
					if (data?.title) titleCandidates.push(data.title)
					if (data?.title_english && data.title_english !== data.title) titleCandidates.push(data.title_english)
					if (data?.title_japanese && data.title_japanese !== data.title) titleCandidates.push(data.title_japanese)
					if (Array.isArray(data?.titles)) {
						for (const t of data.titles) {
							if (t?.title) titleCandidates.push(t.title)
						}
					}
					const tried = new Set()
					for (const t of titleCandidates) {
						const key = String(t).trim().toLowerCase()
						if (!key || tried.has(key)) continue
						tried.add(key)
						const mdSearch = await mangadexService.searchManga({ title: t, limit: 5 })
						const candidates = mdSearch?.data || []
						if (candidates.length) {
							// pick best by matching year or closest title
							const jYear = data?.published?.prop?.from?.year || data?.year
							let best = candidates[0]
							for (const c of candidates) {
								const cYear = c?.attributes?.year
								if (jYear && cYear && cYear === jYear) { best = c; break }
							}
							mdId = best?.id || null
							if (mdId) break
						}
					}
				} catch {}
				setComicHid(mdId || null)
				
				// Try to extract rating from various possible fields
				const possibleRatingFields = [data?.score]
				
				const foundRating = possibleRatingFields.find(rating => 
					rating !== null && rating !== undefined && !isNaN(parseFloat(rating)) && parseFloat(rating) > 0
				)
				
				if (foundRating) {
					const numericRating = parseFloat(foundRating)
					// Convert to 5-star scale if needed (assuming API might use 10-point scale)
					const fiveStarRating = numericRating > 5 ? (numericRating / 2) : numericRating
					setMangaRating(Math.min(5, Math.max(0, fiveStarRating)))
				} else {
					// No rating data available
					setMangaRating(null)
				}
			})
			.catch(err => {
				if (!isMountedRef.current) return
				setError(err.message || 'Failed to load manga')
			})
			.finally(() => {
				if (isMountedRef.current) {
					setLoading(false)
				}
			})
	}, [slug])

	// Persist all filter states to localStorage
	useEffect(() => {
		try {
			localStorage.setItem('manga.selectedLang', selectedLang || '')
		} catch {}
	}, [selectedLang])

	useEffect(() => {
		try {
			localStorage.setItem('manga.chapterSearch', chapterSearch || '')
		} catch {}
	}, [chapterSearch])

	useEffect(() => {
		try {
			localStorage.setItem('manga.sortOrder', sortOrder || 'desc')
		} catch {}
	}, [sortOrder])

	useEffect(() => {
		try {
			localStorage.setItem('manga.showOnlyUnread', showOnlyUnread.toString())
		} catch {}
	}, [showOnlyUnread])

	useEffect(() => {
		try {
			localStorage.setItem('manga.selectedVolume', selectedVolume || '')
		} catch {}
	}, [selectedVolume])

	useEffect(() => {
		try {
			localStorage.setItem('manga.selectedChapter', selectedChapter || '')
		} catch {}
	}, [selectedChapter])

	// Persist reading progress
	useEffect(() => {
		try {
			localStorage.setItem('manga.readingProgress', JSON.stringify(readingProgress))
		} catch {}
	}, [readingProgress])

	// Persist bookmarks
	useEffect(() => {
		try {
			localStorage.setItem('manga.bookmarks', JSON.stringify([...bookmarks]))
		} catch {}
	}, [bookmarks])

	// Persist filter collapse state
	useEffect(() => {
		try {
			localStorage.setItem('manga.isFiltersCollapsed', isFiltersCollapsed.toString())
		} catch {}
	}, [isFiltersCollapsed])

	// Debounce search input for better performance
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(chapterSearch)
		}, 300)

		return () => clearTimeout(timer)
	}, [chapterSearch])

	// Reset visible chapters count when filters change
	useEffect(() => {
		setVisibleChaptersCount(100)
	}, [selectedLang, selectedVolume, selectedChapter, showOnlyUnread, debouncedSearch, sortOrder])

	// Close overlay on outside click to avoid double-dismiss
	useEffect(() => {
		const onDocMouseDown = (e) => {
			if (!isFilterFocus) return
			const el = filtersRef.current
			if (el && el.contains(e.target)) return
			setIsFilterFocus(false)
		}
		document.addEventListener('mousedown', onDocMouseDown)
		return () => document.removeEventListener('mousedown', onDocMouseDown)
	}, [isFilterFocus])

	// Optimized initial chapter loading with parallel fetching and larger batches
	useEffect(() => {
		if (!comicHid || !isMountedRef.current) return
		
		setLoadingChapters(true)
		setChapters([])
		setSelectedVolume('')
		setSelectedChapter('')
		
		const primaryLang = selectedLang || 'en'
		
		const loadInitialChapters = async () => {
			try {
				// Prefer aggregate to enumerate volumes/chapters reliably
				try {
					const agg = await mangadexService.getAggregate(comicHid, { translatedLanguage: [primaryLang] })
					const volumesObj = agg?.volumes || {}
					const volKeys = Object.keys(volumesObj)
					const flat = []
					for (const v of volKeys) {
						const chaptersObj = volumesObj[v]?.chapters || {}
						for (const chNum of Object.keys(chaptersObj)) {
							const chInfo = chaptersObj[chNum]
							const firstId = (chInfo?.chapter || chInfo)?.id || chInfo?.id
							flat.push({ id: firstId, hid: firstId, vol: v === 'none' ? '' : v, chap: chNum, title: '', lang: primaryLang })
						}
					}
					if (flat.length) {
						console.log('[MangaDetails] Aggregate(lang) volumes:', volKeys.length, 'chapters:', flat.length)
						flat.sort((a,b)=> (parseFloat(a.vol)||0)-(parseFloat(b.vol)||0) || (parseFloat(a.chap)||0)-(parseFloat(b.chap)||0))
						setChapters(flat)
						setAllChaptersMeta(flat)
						setAvailableLangs(prev => prev.length ? prev : [primaryLang])
						setDebugCounts(prev => ({ ...(prev||{}), aggVolsLang: volKeys.length, aggChLang: flat.length }))
						return
					}
				} catch {}

				// Aggregate without language to enumerate all volumes/chapters comprehensively
				try {
					const aggAll = await mangadexService.getAggregate(comicHid)
					const volumesObjAll = aggAll?.volumes || {}
					const flatAll = []
					for (const v of Object.keys(volumesObjAll)) {
						const chaptersObj = volumesObjAll[v]?.chapters || {}
						for (const chNum of Object.keys(chaptersObj)) {
							const chInfo = chaptersObj[chNum]
							const firstId = (chInfo?.chapter || chInfo)?.id || chInfo?.id
							flatAll.push({ id: firstId, hid: firstId, vol: v === 'none' ? '' : v, chap: chNum, title: '', lang: '' })
						}
					}
					if (flatAll.length) {
						console.log('[MangaDetails] Aggregate(all) volumes:', Object.keys(volumesObjAll).length, 'chapters:', flatAll.length)
						flatAll.sort((a,b)=> (parseFloat(a.vol)||0)-(parseFloat(b.vol)||0) || (parseFloat(a.chap)||0)-(parseFloat(b.chap)||0))
						// Dedup by id
						const seen = new Set(); const uniq = []
						for (const ch of flatAll) { if (!seen.has(ch.hid)) { seen.add(ch.hid); uniq.push(ch) } }
						setAllChaptersMeta(uniq)
						setDebugCounts(prev => ({ ...(prev||{}), aggVolsAll: Object.keys(volumesObjAll).length, aggChAll: uniq.length }))
					}
				} catch {}
				// MangaDex feed for selected language (may be sparse)
				let feed = await mangadexService.getMangaFeed(comicHid, { limit: 100, translatedLanguage: [primaryLang], order: { chapter: 'asc' } })
				if (!isMountedRef.current) return
				let mdChaps = feed?.data || []
				console.log('[MangaDetails] Feed(lang) batch size:', mdChaps.length)
				// Always fetch a comprehensive all-language list deeply to build complete volumes/chapters
				const pageSize = 100
				let offset = 0
				let all = []
				while (offset < 5000) {
					const resp = await mangadexService.getMangaFeed(comicHid, { limit: pageSize, order: { chapter: 'asc' }, offset })
					const chunk = resp?.data || []
					all = all.concat(chunk)
					if (!chunk.length || chunk.length < pageSize) break
					offset += pageSize
				}
				console.log('[MangaDetails] Feed(all) total items:', all.length)
				const normalizedAll = all.map(ch => ({
					id: ch?.id,
					hid: ch?.id,
					chap: ch?.attributes?.chapter,
					vol: ch?.attributes?.volume,
					title: ch?.attributes?.title,
					lang: ch?.attributes?.translatedLanguage
				})).filter(c => c.hid)
				// Dedup all-language list
				const dedupAll = []
				const seenAll = new Set()
				for (const ch of normalizedAll) { if (!seenAll.has(ch.hid)) { seenAll.add(ch.hid); dedupAll.push(ch) } }
				setAllChaptersMeta(dedupAll)
				// Update available languages from comprehensive list
				const langsSetAll = new Set(dedupAll.map(c => (c?.lang || '').trim()).filter(Boolean))
				const langsAll = Array.from(langsSetAll).sort((a,b)=> a==='en'?-1:b==='en'?1:a.localeCompare(b))
				setAvailableLangs(prev => prev.length ? prev : langsAll)
				// Normalize to existing shape expectations minimally
				const normalized = mdChaps.map(ch => ({
					id: ch?.id,
					hid: ch?.id,
					chap: ch?.attributes?.chapter,
					vol: ch?.attributes?.volume,
					title: ch?.attributes?.title,
					lang: ch?.attributes?.translatedLanguage
				}))
				// Deduplicate by id
				const uniqueById = []
				const seenIds = new Set()
				for (const ch of normalized) {
					if (!ch?.hid || seenIds.has(ch.hid)) continue
					seenIds.add(ch.hid)
					uniqueById.push(ch)
				}
				setChapters(uniqueById.length ? uniqueById : dedupAll)
				setDebugCounts(prev => ({ ...(prev||{}), feedLang: mdChaps.length, feedAll: dedupAll.length }))
				const langsSet = new Set(normalized.map(c => (c?.lang || '').trim()).filter(Boolean))
				// Ensure the current primary language appears first if present
				const langs = Array.from(langsSet).sort((a, b) => (a === primaryLang ? -1 : b === primaryLang ? 1 : a.localeCompare(b)))
				setAvailableLangs(langs)
				// If current selected language is not available, reset to show all
				if (selectedLang && !langs.includes(selectedLang)) {
					setSelectedLang('')
				}
			} catch (err) {
				if (!isMountedRef.current) return
				setError(err.message || 'Failed to load chapters')
			} finally {
				if (isMountedRef.current) {
					setLoadingChapters(false)
				}
			}
		}
		
		loadInitialChapters()
	}, [comicHid, selectedLang, chaptersRetryCount])

	const handleRetryChapters = () => {
		setChaptersRetryCount(c => c + 1)
	}

	const showMoreChapters = () => {
		setVisibleChaptersCount(prev => Math.min(prev + 100, displayedChapters.length))
	}

	const resetVisibleChapters = () => {
		setVisibleChaptersCount(100)
	}

	// Cached API call function to avoid redundant requests
	const cachedApiCall = useCallback(async (cacheKey, apiCall) => {
		if (requestCache.has(cacheKey)) {
			return requestCache.get(cacheKey)
		}
		
		try {
			const result = await apiCall()
			setRequestCache(prev => new Map(prev).set(cacheKey, result))
			return result
		} catch (error) {
			// Don't cache errors
			throw error
		}
	}, [requestCache])

	// Optimized background fetch with parallel processing and larger batches
	useEffect(() => {
		if (!comicHid || !isMountedRef.current) return
		
		setLoadingAllVolumes(true)
		const fetchAllLanguagesOptimized = async () => {
			try {
				const pageSize = 100
				let offset = 0
				let all = []
				for (let i = 0; i < 5; i++) {
					const resp = await mangadexService.getMangaFeed(comicHid, { limit: pageSize, order: { chapter: 'desc' }, offset })
					const chunk = resp?.data || []
					all = all.concat(chunk)
					if (!chunk.length || chunk.length < pageSize) break
					offset += pageSize
				}
				const normalized = all.map(ch => ({
					id: ch?.id,
					hid: ch?.id,
					chap: ch?.attributes?.chapter,
					vol: ch?.attributes?.volume,
					title: ch?.attributes?.title,
					lang: ch?.attributes?.translatedLanguage
				}))
				setAllChaptersMeta(prev => {
					const seen = new Set(prev.map(c => c?.hid || c?.id))
					const merged = [...prev]
					for (const ch of normalized) {
						const key = ch?.hid || ch?.id
						if (key && !seen.has(key)) { seen.add(key); merged.push(ch) }
					}
					return merged
				})
				// Update available languages if empty
				setAvailableLangs(prev => {
					if (prev && prev.length) return prev
					const langs = Array.from(new Set(normalized.map(c => (c?.lang || '').trim()).filter(Boolean))).sort((a,b)=>a==="en"?-1:b==="en"?1:a.localeCompare(b))
					return langs
				})
			} catch (error) {
				console.warn('Background chapter loading error:', error)
			} finally {
				if (isMountedRef.current) setLoadingAllVolumes(false)
			}
		}
		fetchAllLanguagesOptimized()
	}, [comicHid])

	// Derive available volumes/chapters
	useEffect(() => {
		// Always derive the volumes list from the comprehensive meta (all languages)
		const volumeSourceRaw = allChaptersMeta.length ? allChaptersMeta : chapters
		const vols = Array.from(new Set(volumeSourceRaw
			.map(c => (c?.vol ?? '').toString())
			.filter(v => v !== 'null' && v !== 'undefined')))
			.map(v => v === '' ? '0' : v)
		vols.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0))
		// Map '0' back to empty label for UI, keep numeric order
		const normalizedVols = vols.map(v => v === '0' ? '' : v)
		setAvailableVolumes(normalizedVols)

		// Chapters list respects current language + selected volume
		const chapterSourceRaw = allChaptersMeta.length ? allChaptersMeta : chapters
		const chapterSourceLang = selectedLang
			? chapterSourceRaw.filter(c => (c?.lang || c?.language || '').trim() === selectedLang)
			: chapterSourceRaw
		const sourceForChapters = selectedVolume
			? chapterSourceLang.filter(c => String(c?.vol ?? '') === String(selectedVolume))
			: chapterSourceLang
		const chaps = Array.from(new Set(sourceForChapters
			.map(c => (c?.chap ?? '').toString())
			.filter(v => v && v !== 'null' && v !== 'undefined')))
		chaps.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0))
		setAvailableChapters(chaps)
		if (selectedChapter && !chaps.includes(selectedChapter)) setSelectedChapter('')
	}, [chapters, allChaptersMeta, selectedVolume, selectedLang])


	// Apply filters to displayed list (defer while loading all volumes)
	const displayedChapters = useMemo(() => {
		const baseAll = allChaptersMeta.length ? allChaptersMeta : chapters
		if (loadingAllVolumes) {
			// Do not apply any filters while volumes are still loading
			return baseAll
		}
		const baseLang = selectedLang
			? baseAll.filter(c => (c?.lang || c?.language || '').trim() === selectedLang)
			: baseAll
		let filtered = baseLang.filter(c => {
			if (selectedVolume && String(c?.vol ?? '') !== String(selectedVolume)) return false
			if (selectedChapter && String(c?.chap ?? '') !== String(selectedChapter)) return false
			if (showOnlyUnread && isChapterRead(c)) return false
			if (debouncedSearch) {
				const searchTerm = debouncedSearch.toLowerCase()
				const chapterTitle = (c?.title || '').toLowerCase()
				const chapterNum = String(c?.chap || '').toLowerCase()
				const volumeNum = String(c?.vol || '').toLowerCase()
				if (!chapterTitle.includes(searchTerm) && !chapterNum.includes(searchTerm) && !volumeNum.includes(searchTerm)) return false
			}
			return true
		})
		filtered.sort((a, b) => {
			const aVol = parseFloat(a?.vol || 0)
			const bVol = parseFloat(b?.vol || 0)
			const aChap = parseFloat(a?.chap || 0)
			const bChap = parseFloat(b?.chap || 0)
			if (aVol !== bVol) return sortOrder === 'asc' ? aVol - bVol : bVol - aVol
			return sortOrder === 'asc' ? aChap - bChap : bChap - aChap
		})
		return filtered
	}, [allChaptersMeta, chapters, loadingAllVolumes, selectedLang, selectedVolume, selectedChapter, showOnlyUnread, debouncedSearch, sortOrder, isChapterRead])

	// Auto-clear language filter when it hides a large portion of available chapters
	useEffect(() => {
		if (!selectedLang) return
		const total = allChaptersMeta.length
		const visible = displayedChapters.length
		if (total >= 10 && visible > 0 && visible <= Math.max(3, Math.floor(total * 0.3))) {
			setSelectedLang('')
		}
	}, [selectedLang, displayedChapters.length, allChaptersMeta.length])

	// FIXED: Prefetch images with memory leak prevention
	useEffect(() => {
		if (!displayedChapters || displayedChapters.length === 0 || !isMountedRef.current) return
		
		const first = displayedChapters[0]
		const hid = first?.hid || first?.id
		if (!hid) return
		
		// FIXED: Clear previous timeout
		if (prefetchTimeoutRef.current) {
			clearTimeout(prefetchTimeoutRef.current)
		}
		
		const schedule = (cb) => {
			if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
				window.requestIdleCallback(() => { 
					if (isMountedRef.current) cb() 
				}, { timeout: 1500 })
			} else {
				prefetchTimeoutRef.current = setTimeout(() => { 
					if (isMountedRef.current) cb() 
				}, 400)
			}
		}
		
				schedule(() => {
					if (isMountedRef.current) {
						// Best-effort prime At-Home metadata
						mangadexService.getChapter(hid).catch(() => {})
					}
				})
		
		return () => {
			if (prefetchTimeoutRef.current) {
				clearTimeout(prefetchTimeoutRef.current)
				prefetchTimeoutRef.current = null
			}
		}
	}, [displayedChapters])

	return (
		<div className="min-h-screen px-4 py-6">
			<div>
				<div className="mb-4">
					<div className="relative inline-block group">
						<button
							onClick={() => navigate('/manga')}
							className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 shadow-sm hover:shadow backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
							aria-label="Back to manga list"
						>
							<span className="text-base">←</span>
						</button>
						{/* Tooltip */}
						<div className="absolute left-full top-1/2 border border-white/10 -translate-y-1/2 ml-3 px-3 py-2 bg-black/90 text-white text-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg">
							Back to Manga list
							{/* Tooltip arrow */}
							<div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-transparent border-r-black/90"></div>
						</div>
					</div>
				</div>

				{/* Overlay removed per request */}

				{loading && (
					<div className="max-w-[90rem] mx-auto">
						{/* Mobile Layout Skeleton */}
						<div className="grid grid-cols-5 gap-4 lg:hidden mb-6">
							{/* Left: Cover Image Skeleton */}
							<div className="relative group col-span-3">
								<div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
									<div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5" />
								</div>
							</div>

							{/* Right: Manga Stats Skeleton */}
							<div className="space-y-3 col-span-2">
								{/* Title */}
								<div className="h-6 w-4/5 bg-white/10 rounded" />
								
								{/* Alternative Titles */}
								<div className="h-4 w-3/4 bg-white/5 rounded" />

								{/* Rating */}
								<div className="flex items-center space-x-2">
									<div className="flex space-x-1">
										{Array.from({ length: 5 }).map((_, i) => (
											<div key={i} className="w-3 h-3 bg-white/10 rounded" />
										))}
									</div>
									<div className="h-4 w-8 bg-white/5 rounded" />
								</div>

								{/* Stats */}
								<div className="space-y-3">
									{/* Status */}
									<div className="flex items-center space-x-2">
										<div className="h-4 w-12 bg-white/5 rounded" />
										<div className="h-6 w-20 bg-white/10 rounded-full" />
									</div>

									{/* Chapter Count */}
									<div className="flex items-center space-x-2">
										<div className="h-4 w-16 bg-white/5 rounded" />
										<div className="h-4 w-8 bg-white/10 rounded" />
									</div>

									{/* Engagement Stats */}
									<div className="space-y-2">
										<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
											<div className="h-4 w-12 bg-white/10 rounded" />
											<div className="h-5 w-16 bg-white/10 rounded" />
										</div>
										<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
											<div className="h-4 w-14 bg-white/10 rounded" />
											<div className="h-5 w-12 bg-white/10 rounded" />
										</div>
									</div>

									{/* Authors */}
									<div className="flex items-start space-x-2">
										<div className="h-4 w-12 bg-white/5 rounded" />
										<div className="h-4 w-24 bg-white/10 rounded" />
									</div>

									{/* Genres */}
									<div className="flex items-start space-x-2">
										<div className="h-4 w-12 bg-white/5 rounded" />
										<div className="flex flex-wrap gap-1">
											{Array.from({ length: 3 }).map((_, i) => (
												<div key={i} className="h-5 w-16 bg-white/10 rounded-full" />
											))}
										</div>
									</div>

									{/* Year */}
									<div className="flex items-center space-x-2">
										<div className="h-4 w-8 bg-white/5 rounded" />
										<div className="h-4 w-12 bg-white/10 rounded" />
									</div>

									{/* Language */}
									<div className="flex items-center space-x-2">
										<div className="h-4 w-16 bg-white/5 rounded" />
										<div className="h-4 w-12 bg-white/10 rounded" />
									</div>
								</div>
							</div>
						</div>

						{/* Mobile Description Skeleton */}
						<div className="lg:hidden mb-6">
							<div className="h-6 w-24 bg-white/10 rounded mb-3" />
							<div className="space-y-2">
								<div className="h-4 w-full bg-white/5 rounded" />
								<div className="h-4 w-11/12 bg-white/5 rounded" />
								<div className="h-4 w-10/12 bg-white/5 rounded" />
								<div className="h-4 w-9/12 bg-white/5 rounded" />
							</div>
						</div>

						{/* Desktop Layout Skeleton */}
						<div className="hidden lg:grid lg:grid-cols-5 gap-6 lg:gap-8">
							{/* Left: Cover + Stats + Description */}
							<div className="lg:col-span-2">
								<div className="sticky top-4">
									{/* Top Section: Cover Image and Stats Side by Side */}
									<div className="flex gap-4 mb-6">
										{/* Cover Image Skeleton */}
										<div className="relative group flex-shrink-0">
											<div className="relative aspect-[3/4] w-64 overflow-hidden rounded-xl border border-white/10 bg-white/5">
												<div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5" />
											</div>
										</div>

										{/* Manga Stats Skeleton */}
										<div className="flex-1 space-y-3">
											{/* Title */}
											<div className="h-7 w-4/5 bg-white/10 rounded" />
											
											{/* Alternative Titles */}
											<div className="h-4 w-3/4 bg-white/5 rounded" />

											{/* Rating */}
											<div className="flex items-center space-x-2">
												<div className="flex space-x-1">
													{Array.from({ length: 5 }).map((_, i) => (
														<div key={i} className="w-4 h-4 bg-white/10 rounded" />
													))}
												</div>
												<div className="h-4 w-8 bg-white/5 rounded" />
											</div>

											{/* Enhanced Stats */}
											<div className="space-y-3">
												{/* Status */}
												<div className="flex items-center space-x-2">
													<div className="h-4 w-12 bg-white/5 rounded" />
													<div className="h-6 w-20 bg-white/10 rounded-full" />
												</div>

												{/* Chapter Count */}
												<div className="flex items-center space-x-2">
													<div className="h-4 w-16 bg-white/5 rounded" />
													<div className="h-4 w-8 bg-white/10 rounded" />
												</div>

												{/* Engagement Stats */}
												<div className="space-y-2">
													<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
														<div className="h-4 w-12 bg-white/10 rounded" />
														<div className="h-5 w-16 bg-white/10 rounded" />
													</div>
													<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
														<div className="h-4 w-14 bg-white/10 rounded" />
														<div className="h-5 w-12 bg-white/10 rounded" />
													</div>
													<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
														<div className="h-4 w-16 bg-white/10 rounded" />
														<div className="h-5 w-14 bg-white/10 rounded" />
													</div>
												</div>

												{/* Authors */}
												<div className="flex items-start space-x-2">
													<div className="h-4 w-12 bg-white/5 rounded" />
													<div className="h-4 w-32 bg-white/10 rounded" />
												</div>

												{/* Genres */}
												<div className="flex items-start space-x-2">
													<div className="h-4 w-12 bg-white/5 rounded" />
													<div className="flex flex-wrap gap-1">
														{Array.from({ length: 3 }).map((_, i) => (
															<div key={i} className="h-5 w-16 bg-white/10 rounded-full" />
														))}
													</div>
												</div>

												{/* Year */}
												<div className="flex items-center space-x-2">
													<div className="h-4 w-8 bg-white/5 rounded" />
													<div className="h-4 w-12 bg-white/10 rounded" />
												</div>

												{/* Language */}
												<div className="flex items-center space-x-2">
													<div className="h-4 w-16 bg-white/5 rounded" />
													<div className="h-4 w-12 bg-white/10 rounded" />
												</div>

												{/* Content Rating */}
												<div className="flex items-center space-x-2">
													<div className="h-4 w-12 bg-white/5 rounded" />
													<div className="h-6 w-16 bg-white/10 rounded-full" />
												</div>

												{/* Demographic */}
												<div className="flex items-center space-x-2">
													<div className="h-4 w-20 bg-white/5 rounded" />
													<div className="h-4 w-16 bg-white/10 rounded" />
												</div>

												{/* Publisher & Serialization */}
												<div className="space-y-2">
													<div className="flex items-center space-x-2">
														<div className="h-4 w-16 bg-white/5 rounded" />
														<div className="h-4 w-24 bg-white/10 rounded" />
													</div>
													<div className="flex items-center space-x-2">
														<div className="h-4 w-20 bg-white/5 rounded" />
														<div className="h-4 w-28 bg-white/10 rounded" />
													</div>
												</div>

												{/* Last Updated */}
												<div className="flex items-center space-x-2">
													<div className="h-4 w-20 bg-white/5 rounded" />
													<div className="h-4 w-20 bg-white/10 rounded" />
												</div>
											</div>
										</div>
									</div>

									{/* Description Skeleton */}
									<div className="mt-6">
										<div className="h-6 w-24 bg-white/10 rounded mb-3" />
										<div className="space-y-2">
											<div className="h-4 w-full bg-white/5 rounded" />
											<div className="h-4 w-11/12 bg-white/5 rounded" />
											<div className="h-4 w-10/12 bg-white/5 rounded" />
											<div className="h-4 w-9/12 bg-white/5 rounded" />
											<div className="h-4 w-8/12 bg-white/5 rounded" />
										</div>
									</div>
								</div>
							</div>

							{/* Right: Enhanced Filters + Chapters Skeleton */}
							<div className="lg:col-span-3">
								<div className="sticky top-4">
									{/* Enhanced Filter Controls Skeleton */}
									<div className="bg-[#181c20] rounded-2xl border border-white/10 p-4 mb-6">
										<div className="flex items-center justify-between mb-4">
											<div className="h-6 w-20 bg-white/10 rounded" />
											<div className="flex items-center space-x-3">
												<div className="h-4 w-16 bg-white/5 rounded" />
												<div className="h-8 w-24 bg-white/5 rounded-full" />
											</div>
										</div>

										{/* Search and Sort Controls Skeleton */}
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
											<div className="h-8 w-full bg-white/5 rounded-full" />
											<div className="h-8 w-full bg-white/5 rounded-full" />
											<div className="h-8 w-full bg-white/5 rounded-full" />
											<div className="h-8 w-full bg-white/5 rounded-full" />
										</div>

										{/* Additional Filter Options Skeleton */}
										<div className="flex flex-wrap items-center gap-3">
											<div className="flex items-center space-x-2">
												<div className="w-4 h-4 bg-white/5 rounded-full" />
												<div className="h-4 w-24 bg-white/5 rounded" />
											</div>
											<div className="h-8 w-24 bg-white/5 rounded-full" />
										</div>
									</div>

									{/* Chapter List Skeleton */}
									<div className="space-y-2 max-h-[calc(100vh-31rem)] overflow-y-auto">
										{Array.from({ length: 12 }).map((_, i) => (
											<div key={i} className="w-full flex items-center justify-between px-3 py-2 rounded-full bg-white/5 border border-white/10">
												<div className="flex items-center space-x-2">
													<div className="h-4 w-24 bg-white/10 rounded" />
													<div className="h-3 w-16 bg-white/5 rounded" />
												</div>
												<div className="flex items-center space-x-2">
													<div className="h-3 w-12 bg-white/5 rounded" />
													<div className="w-4 h-4 bg-white/5 rounded" />
												</div>
											</div>
										))}
									</div>

									{/* Load More Button Skeleton */}
									<div className="text-center py-4 mt-4">
										<div className="inline-flex h-9 w-48 bg-white/5 border border-white/10 rounded-full" />
									</div>
								</div>
							</div>
						</div>

						{/* Mobile Chapters Section Skeleton */}
						<div className="lg:hidden">
							<div className="bg-[#181c20] rounded-2xl border border-white/10 p-4 mb-6">
								<div className="flex items-center justify-between mb-4">
									<div className="h-6 w-20 bg-white/10 rounded" />
									<div className="flex items-center space-x-2">
										<div className="h-4 w-12 bg-white/5 rounded" />
										<div className="h-8 w-16 bg-white/5 rounded-full" />
									</div>
								</div>

								{/* Mobile Filter Controls Skeleton */}
								<div className="space-y-3">
									<div className="h-8 w-full bg-white/5 rounded-full" />
									<div className="grid grid-cols-2 gap-3">
										<div className="h-8 w-full bg-white/5 rounded-full" />
										<div className="h-8 w-full bg-white/5 rounded-full" />
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="h-8 w-full bg-white/5 rounded-full" />
										<div className="h-8 w-full bg-white/5 rounded-full" />
									</div>
									<div className="flex items-center gap-3">
										<div className="w-4 h-4 bg-white/5 rounded-full" />
										<div className="h-4 w-24 bg-white/5 rounded" />
									</div>
								</div>
							</div>

							{/* Mobile Chapter List Skeleton */}
							<div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
								{Array.from({ length: 8 }).map((_, i) => (
									<div key={i} className="w-full flex items-center justify-between px-3 py-2 rounded-full bg-white/5 border border-white/10">
										<div className="flex items-center space-x-2">
											<div className="h-4 w-20 bg-white/10 rounded" />
											<div className="h-3 w-12 bg-white/5 rounded" />
										</div>
										<div className="flex items-center space-x-2">
											<div className="h-3 w-10 bg-white/5 rounded" />
											<div className="w-4 h-4 bg-white/5 rounded" />
										</div>
									</div>
								))}
							</div>

							{/* Mobile Load More Button Skeleton */}
							<div className="text-center py-4 mt-4 pb-20">
								<div className="inline-flex h-9 w-48 bg-white/5 border border-white/10 rounded-full" />
							</div>
						</div>
					</div>
				)}

				{error && <div className="text-red-400 mb-3">{error}</div>}

				{!loading && info && (
					<div className="max-w-[90rem] mx-auto">
						{/* Mobile Layout: Two columns with poster left, stats right */}
						<div className="grid grid-cols-5 gap-4 lg:hidden mb-6">
							{/* Left: Cover Image */}
							<div className="relative group col-span-3">
								<div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
									{cover && (
										<img
											src={cover}
											alt={info?.title}
											className="w-full h-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.02]"
										/>
									)}
									<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/20" />
									
									{/* Cover Gallery Button */}
									{getCovers.length > 1 && (
										<button
											onClick={() => setShowCoverGallery(true)}
											className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
										>
											<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
											</svg>
										</button>
									)}
								</div>
							</div>

							{/* Right: Manga Stats */}
							<div className="space-y-3 col-span-2">
								{/* Title */}
								<h1 className="text-white text-lg font-bold tracking-tight leading-tight">
									{info?.title || info?.comic?.title}
								</h1>
								
								{/* Alternative Titles */}
								{info?.alt_titles && info.alt_titles.length > 0 && (
									<div>
										<p className="text-gray-400 text-xs">
											{info.alt_titles.slice(0, 1).join(' • ')}
										</p>
									</div>
								)}

								{/* Rating Display - Only show if rating data is available */}
								{mangaRating !== null && (
									<div className="flex items-center space-x-2">
										<div className="flex items-center space-x-1">
											<div className="flex">
												{[...Array(5)].map((_, i) => (
													<svg
														key={i}
														className={`w-3 h-3 ${i < mangaRating ? 'text-yellow-400' : 'text-gray-600'}`}
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
													</svg>
												))}
											</div>
											<span className="text-gray-400 text-xs ml-1">
												{mangaRating.toFixed(1)}
											</span>
										</div>
									</div>
								)}

								{/* Enhanced Stats - Single Column */}
								<div className="space-y-3">
									{/* Status */}
									<div className="flex items-center space-x-2">
										<span className="text-gray-400 text-xs font-medium">Status:</span>
										<span className={`px-2 py-1 rounded-full text-xs font-medium ${
											getStatus === 'Ongoing' ? 'bg-green-500/20 text-green-400' :
											getStatus === 'Completed' ? 'bg-blue-500/20 text-blue-400' :
											getStatus === 'Hiatus' ? 'bg-yellow-500/20 text-yellow-400' :
											getStatus === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
											getStatus === 'Dropped' ? 'bg-red-500/20 text-red-400' :
											'bg-gray-500/20 text-gray-400'
										}`}>
											{getStatus}
										</span>
									</div>

									{/* Chapter Count */}
									<div className="flex items-center space-x-2">
										<span className="text-gray-400 text-xs font-medium">Chapters:</span>
										<span className="text-white text-xs font-medium">{getChapterCount}</span>
									</div>

									{/* Engagement Stats - Single Column */}
									{/* Views */}
									{getViewCount > 0 && (
										<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
											<span className="text-gray-400 text-xs font-medium">Views:</span>
											<span className="text-white text-sm font-bold">{getViewCount.toLocaleString()}</span>
										</div>
									)}

									{/* Follows */}
									{getFollowCount > 0 && (
										<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
											<span className="text-gray-400 text-xs font-medium">Follows:</span>
											<span className="text-white text-sm font-bold">{getFollowCount.toLocaleString()}</span>
										</div>
									)}

									{/* Comments */}
									{getCommentCount > 0 && (
										<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
											<span className="text-gray-400 text-xs font-medium">Comments:</span>
											<span className="text-white text-sm font-bold">{getCommentCount.toLocaleString()}</span>
										</div>
									)}

									{/* Authors */}
									{getAuthors.length > 0 && (
										<div className="flex items-start space-x-2">
											<span className="text-gray-400 text-xs font-medium">Author:</span>
											<div className="flex flex-wrap gap-1">
												{getAuthors.slice(0, 2).map((author, idx) => (
													<span key={idx} className="text-white text-xs">
														{author.name || author}
														{idx < Math.min(getAuthors.length, 2) - 1 && ', '}
													</span>
												))}
												{getAuthors.length > 2 && (
													<span className="text-gray-400 text-xs">+{getAuthors.length - 2}</span>
												)}
											</div>
										</div>
									)}

									{/* Genres - Compact */}
									{getGenres.length > 0 && (
										<div className="flex items-start space-x-2">
											<span className="text-gray-400 text-xs font-medium">Genres:</span>
											<div className="flex flex-wrap gap-1">
												{getGenres.slice(0, 3).map((genre, idx) => (
													<span key={idx} className="px-1.5 py-0.5 bg-white/10 text-white text-xs rounded-full">
														{genre.name || genre}
													</span>
												))}
												{getGenres.length > 3 && (
													<span className="text-gray-400 text-xs">
														+{getGenres.length - 3}
													</span>
												)}
											</div>
										</div>
									)}

									{/* Year */}
									{getPublicationInfo.year && (
										<div className="flex items-center space-x-2">
											<span className="text-gray-400 text-xs font-medium">Year:</span>
											<span className="text-white text-xs">{getPublicationInfo.year}</span>
										</div>
									)}

									{/* Language */}
									<div className="flex items-center space-x-2">
										<span className="text-gray-400 text-xs font-medium">Language:</span>
										<span className="text-white text-xs">{getLanguage}</span>
									</div>

									{/* Content Rating */}
									{getContentRating && (
										<div className="flex items-center space-x-2">
											<span className="text-gray-400 text-xs font-medium">Rating:</span>
											<span className={`px-2 py-1 rounded-full text-xs font-medium ${
												getContentRating === 'Safe' ? 'bg-green-500/20 text-green-400' :
												getContentRating === 'Suggestive' ? 'bg-yellow-500/20 text-yellow-400' :
												getContentRating === 'Erotica' ? 'bg-orange-500/20 text-orange-400' :
												getContentRating === 'Pornographic' ? 'bg-red-500/20 text-red-400' :
												'bg-gray-500/20 text-gray-400'
											}`}>
												{getContentRating}
											</span>
										</div>
									)}

									{/* Demographic */}
									{getDemographic && (
										<div className="flex items-center space-x-2">
											<span className="text-gray-400 text-xs font-medium">Demographic:</span>
											<span className="text-white text-xs">{getDemographic}</span>
										</div>
									)}

									{/* Publisher & Serialization */}
									{(getPublisher || getSerialization) && (
										<div className="space-y-2">
											{getPublisher && (
												<div className="flex items-center space-x-2">
													<span className="text-gray-400 text-xs font-medium">Publisher:</span>
													<span className="text-white text-xs">{getPublisher}</span>
												</div>
											)}
											{getSerialization && (
												<div className="flex items-center space-x-2">
													<span className="text-gray-400 text-xs font-medium">Serialization:</span>
													<span className="text-white text-xs">{getSerialization}</span>
												</div>
											)}
										</div>
									)}

									{/* Last Updated */}
									{getLastUpdated && (
										<div className="flex items-center space-x-2">
											<span className="text-gray-400 text-xs font-medium">Last Updated:</span>
											<span className="text-white text-xs">
												{getLastUpdated.toLocaleDateString()}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Mobile Description - Below both columns */}
						<div className="lg:hidden mb-6">
							<h3 className="text-white text-lg font-semibold mb-3">Description</h3>
							<p className="text-gray-300/90 leading-relaxed whitespace-pre-wrap text-sm">
								{getTruncatedDescription}
							</p>
						</div>

						{/* Desktop Layout: Modified layout with poster left, stats right, description below */}
						<div className="hidden lg:grid lg:grid-cols-5 gap-6 lg:gap-8">
							{/* Left: Cover + Stats + Description */}
							<div className="lg:col-span-2">
								<div className="sticky top-4">
									{/* Top Section: Cover Image and Stats Side by Side */}
									<div className="flex gap-4 mb-6">
										{/* Cover Image with Gallery */}
										<div className="relative group flex-shrink-0">
											<div className="relative aspect-[3/4] w-64 overflow-hidden rounded-xl border border-white/10 bg-white/5">
												{cover && (
													<img
														src={cover}
														alt={info?.title}
														className="w-full h-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.02]"
													/>
												)}
												<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/20" />
												
												{/* Cover Gallery Button */}
												{getCovers.length > 1 && (
													<button
														onClick={() => setShowCoverGallery(true)}
														className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded transition-colors"
													>
														<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
														</svg>
													</button>
												)}
											</div>
										</div>

										{/* Manga Stats */}
										<div className="flex-1 space-y-3">
											{/* Title */}
											<h1 className="text-white text-xl font-bold tracking-tight leading-tight">
												{info?.title || info?.comic?.title}
											</h1>
											
											{/* Alternative Titles */}
											{info?.alt_titles && info.alt_titles.length > 0 && (
												<div>
													<p className="text-gray-400 text-sm">
														{info.alt_titles.slice(0, 1).join(' • ')}
													</p>
												</div>
											)}

											{/* Rating Display - Only show if rating data is available */}
											{mangaRating !== null && (
												<div className="flex items-center space-x-2">
													<div className="flex items-center space-x-1">
														<div className="flex">
															{[...Array(5)].map((_, i) => (
																<svg
																	key={i}
																	className={`w-4 h-4 ${i < mangaRating ? 'text-yellow-400' : 'text-gray-600'}`}
																	fill="currentColor"
																	viewBox="0 0 20 20"
																>
																	<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
																</svg>
															))}
														</div>
														<span className="text-gray-400 text-sm ml-1">
															{mangaRating.toFixed(1)}
														</span>
													</div>
												</div>
											)}

											{/* Enhanced Stats - Single Column */}
											<div className="space-y-3">
												{/* Status */}
												<div className="flex items-center space-x-2">
													<span className="text-gray-400 text-sm font-medium">Status:</span>
													<span className={`px-2 py-1 rounded-full text-sm font-medium ${
														getStatus === 'Ongoing' ? 'bg-green-500/20 text-green-400' :
														getStatus === 'Completed' ? 'bg-blue-500/20 text-blue-400' :
														getStatus === 'Hiatus' ? 'bg-yellow-500/20 text-yellow-400' :
														getStatus === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
														getStatus === 'Dropped' ? 'bg-red-500/20 text-red-400' :
														'bg-gray-500/20 text-gray-400'
													}`}>
														{getStatus}
													</span>
												</div>

												{/* Chapter Count */}
												<div className="flex items-center space-x-2">
													<span className="text-gray-400 text-sm font-medium">Chapters:</span>
													<span className="text-white text-sm font-medium">{getChapterCount}</span>
												</div>

												{/* Engagement Stats - Single Column */}
												{/* Views */}
												{getViewCount > 0 && (
													<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
														<span className="text-gray-400 text-sm font-medium">Views:</span>
														<span className="text-white text-base font-bold">{getViewCount.toLocaleString()}</span>
													</div>
												)}

												{/* Follows */}
												{getFollowCount > 0 && (
													<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
														<span className="text-gray-400 text-sm font-medium">Follows:</span>
														<span className="text-white text-base font-bold">{getFollowCount.toLocaleString()}</span>
													</div>
												)}

												{/* Comments */}
												{getCommentCount > 0 && (
													<div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
														<span className="text-gray-400 text-sm font-medium">Comments:</span>
														<span className="text-white text-base font-bold">{getCommentCount.toLocaleString()}</span>
													</div>
												)}

												{/* Authors */}
												{getAuthors.length > 0 && (
													<div className="flex items-start space-x-2">
														<span className="text-gray-400 text-sm font-medium">Author:</span>
														<div className="flex flex-wrap gap-1">
															{getAuthors.slice(0, 2).map((author, idx) => (
																<span key={idx} className="text-white text-sm">
																	{author.name || author}
																	{idx < Math.min(getAuthors.length, 2) - 1 && ', '}
																</span>
															))}
															{getAuthors.length > 2 && (
																<span className="text-gray-400 text-sm">+{getAuthors.length - 2}</span>
															)}
														</div>
													</div>
												)}

												{/* Genres - Compact */}
												{getGenres.length > 0 && (
													<div className="flex items-start space-x-2">
														<span className="text-gray-400 text-sm font-medium">Genres:</span>
														<div className="flex flex-wrap gap-1">
															{getGenres.slice(0, 3).map((genre, idx) => (
																<span key={idx} className="px-1.5 py-0.5 bg-white/10 text-white text-sm rounded-full">
																	{genre.name || genre}
																</span>
															))}
															{getGenres.length > 3 && (
																<span className="text-gray-400 text-sm">
																	+{getGenres.length - 3}
																</span>
															)}
														</div>
													</div>
												)}

												{/* Year */}
												{getPublicationInfo.year && (
													<div className="flex items-center space-x-2">
														<span className="text-gray-400 text-sm font-medium">Year:</span>
														<span className="text-white text-sm">{getPublicationInfo.year}</span>
													</div>
												)}

												{/* Language */}
												<div className="flex items-center space-x-2">
													<span className="text-gray-400 text-sm font-medium">Language:</span>
													<span className="text-white text-sm">{getLanguage}</span>
												</div>

												{/* Content Rating */}
												{getContentRating && (
													<div className="flex items-center space-x-2">
														<span className="text-gray-400 text-sm font-medium">Rating:</span>
														<span className={`px-2 py-1 rounded-full text-sm font-medium ${
															getContentRating === 'Safe' ? 'bg-green-500/20 text-green-400' :
															getContentRating === 'Suggestive' ? 'bg-yellow-500/20 text-yellow-400' :
															getContentRating === 'Erotica' ? 'bg-orange-500/20 text-orange-400' :
															getContentRating === 'Pornographic' ? 'bg-red-500/20 text-red-400' :
															'bg-gray-500/20 text-gray-400'
														}`}>
															{getContentRating}
														</span>
													</div>
												)}

												{/* Demographic */}
												{getDemographic && (
													<div className="flex items-center space-x-2">
														<span className="text-gray-400 text-sm font-medium">Demographic:</span>
														<span className="text-white text-sm">{getDemographic}</span>
													</div>
												)}

												{/* Publisher & Serialization */}
												{(getPublisher || getSerialization) && (
													<div className="space-y-2">
														{getPublisher && (
															<div className="flex items-center space-x-2">
																<span className="text-gray-400 text-sm font-medium">Publisher:</span>
																<span className="text-white text-sm">{getPublisher}</span>
															</div>
														)}
														{getSerialization && (
															<div className="flex items-center space-x-2">
																<span className="text-gray-400 text-sm font-medium">Serialization:</span>
																<span className="text-white text-sm">{getSerialization}</span>
															</div>
														)}
													</div>
												)}

												{/* Last Updated */}
												{getLastUpdated && (
													<div className="flex items-center space-x-2">
														<span className="text-gray-400 text-sm font-medium">Last Updated:</span>
														<span className="text-white text-sm">
															{getLastUpdated.toLocaleDateString()}
														</span>
													</div>
												)}
											</div>
										</div>
									</div>

									{/* Description - Below both poster and stats */}
									<div className="mt-6">
										<h3 className="text-white text-xl font-semibold mb-3">Description</h3>
										<p className="text-gray-300/90 leading-relaxed whitespace-pre-wrap text-base">
											{getTruncatedDescription}
										</p>
									</div>
								</div>
							</div>

							{/* Right: Enhanced Filters + Chapters */}
							<div className="lg:col-span-3">
							<div className="sticky top-4">
								{/* Enhanced Filter Controls */}
								<div className={`bg-[#181c20] rounded-2xl border border-white/10 transition-all duration-300 ${
									isFiltersCollapsed ? 'p-3 mb-3' : 'p-4 mb-6'
								}`}>
									<div className={`flex items-center justify-between transition-all duration-300 ${
										isFiltersCollapsed ? 'mb-0' : 'mb-4'
									}`}>
										<button 
											onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
											className="flex items-center space-x-3 hover:bg-white/5 rounded-lg p-1 -m-1 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
											aria-label={isFiltersCollapsed ? 'Expand filters' : 'Collapse filters'}
										>
											<h2 className="text-white text-lg font-semibold">Chapters</h2>
											<svg 
												className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFiltersCollapsed ? 'rotate-180' : ''}`} 
												fill="none" 
												stroke="currentColor" 
												viewBox="0 0 24 24"
											>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
										</button>
										<div className="flex items-center space-x-3">
											<span className="text-gray-400 text-sm">
												{displayedChapters.length} chapter{displayedChapters.length !== 1 ? 's' : ''}
												{allChaptersMeta.length > 0 && allChaptersMeta.length !== displayedChapters.length && (
													<span className="text-gray-500">
														{' '}({allChaptersMeta.length} total)
													</span>
												)}
											</span>
											{hasActiveFilters && (
												<button
													onClick={clearAllFilters}
													className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-full border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200 flex items-center space-x-1"
												>
													<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
													</svg>
													<span className="block md:hidden">Clear</span>
													<span className="hidden md:block">Clear Filters</span>
												</button>
											)}
										</div>
									</div>

									{/* Collapsible Filter Content */}
									<AnimatePresence>
										{!isFiltersCollapsed && (
											<motion.div
												initial={{ height: 0, opacity: 0 }}
												animate={{ height: 'auto', opacity: 1 }}
												exit={{ height: 0, opacity: 0 }}
												transition={{ duration: 0.3, ease: 'easeInOut' }}
												className="overflow-hidden"
											>

									{/* Search and Sort Controls */}
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
										{/* Chapter Search */}
										<div className="relative">
											<input
												type="text"
												placeholder="Search chapters..."
												value={chapterSearch}
												onChange={(e) => setChapterSearch(e.target.value)}
												className="w-full bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors placeholder-gray-400"
											/>
											<svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
											</svg>
										</div>

										{/* Language Filter */}
										<select
											value={selectedLang}
											onChange={(e) => setSelectedLang(e.target.value)}
											className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
										>
											<option value="">All languages</option>
											{availableLangs.map((l) => (
												<option key={l} value={l}>{getLanguageLabel(l)}</option>
											))}
										</select>

										{/* Volume Filter */}
										<select
											value={selectedVolume}
											onChange={(e) => { setSelectedVolume(e.target.value); setSelectedChapter('') }}
											className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
										>
											<option value="">All volumes</option>
											{availableVolumes.map((v) => (
												<option key={v} value={v}>Vol {v}</option>
											))}
										</select>

										{/* Sort Order */}
										<select
											value={sortOrder}
											onChange={(e) => setSortOrder(e.target.value)}
											className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
										>
											<option value="desc">Newest first</option>
											<option value="asc">Oldest first</option>
										</select>
									</div>

									{/* Additional Filter Options */}
									<div className="flex flex-wrap items-center gap-3">
										<label className="flex items-center space-x-2 cursor-pointer">
											<input
												type="checkbox"
												checked={showOnlyUnread}
												onChange={(e) => setShowOnlyUnread(e.target.checked)}
												className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded-full focus:ring-blue-500 focus:ring-2"
											/>
											<span className="text-gray-300 text-sm">Show only unread</span>
										</label>

										{/* Chapter Filter */}
										<select
											value={selectedChapter}
											onChange={(e) => setSelectedChapter(e.target.value)}
											className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
										>
											<option value="">All chapters</option>
											{availableChapters.map((c) => (
												<option key={c} value={c}>Ch {c}</option>
											))}
										</select>
									</div>

									{/* Active Filters Summary */}
									{hasActiveFilters && (
										<div className="mt-4 pt-4 border-t border-white/10">
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-gray-400 text-xs font-medium">Active filters:</span>
												{selectedLang && (
													<span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
														{getLanguageLabel(selectedLang)}
													</span>
												)}
												{chapterSearch && (
													<span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
														Search: "{chapterSearch}"
													</span>
												)}
												{showOnlyUnread && (
													<span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
														Unread only
													</span>
												)}
												{selectedVolume && (
													<span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
														Vol {selectedVolume}
													</span>
												)}
												{selectedChapter && (
													<span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full">
														Ch {selectedChapter}
													</span>
												)}
												{sortOrder !== 'desc' && (
													<span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
														Oldest first
													</span>
												)}
											</div>
										</div>
									)}

									{(loadingChapters || loadingAllVolumes) && (
										<div className="mt-4 flex justify-center">
											<EnhancedLoadingIndicator
												isLoading={true}
												error={null}
												retryCount={chaptersRetryCount}
												onRetry={handleRetryChapters}
												context="chapters"
												className="col-span-full"
												hasContent={allChaptersMeta.length > 0}
											/>
										</div>
									)}
									{loadingAllVolumes && allChaptersMeta.length > 0 && (
										<div className="mt-2 text-center">
											<div className="text-gray-400 text-xs mb-2">
												Loading languages... ({loadingProgress.loaded}/{loadingProgress.total}) - {loadingProgress.currentLang}
											</div>
											<div className="w-full bg-gray-700 rounded-full h-1.5">
												<div 
													className="bg-white/80 h-1.5 rounded-full transition-all duration-300"
													style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
												></div>
											</div>
											<div className="text-gray-500 text-xs mt-1">
												{allChaptersMeta.length} chapters loaded so far
											</div>
										</div>
									)}
											</motion.div>
										)}
									</AnimatePresence>
								</div>

								{/* Chapter List - Display chapters with virtual scrolling */}
								<div className="space-y-2 max-h-[calc(100vh-31rem)] overflow-y-auto">
									<AnimatePresence mode="popLayout">
										{displayedChapters.slice(0, visibleChaptersCount).map((ch, idx) => (
											<motion.div
												key={ch?.hid || ch?.id || idx}
												layout
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10, scale: 0.98 }}
												transition={{ 
													duration: 0.2, 
													delay: Math.min(idx * 0.01, 0.1),
													layout: { duration: 0.15, ease: "easeOut" }
												}}
											>
												<ChapterRow
													ch={ch}
													isRead={isChapterRead(ch)}
													isBookmarked={isChapterBookmarked(ch)}
													onRead={() => {
														const hid = ch?.hid || ch?.id
														if (hid) {
															markChapterAsRead(hid)
															navigate(`/manga/chapter/${encodeURIComponent(hid)}`)
														}
													}}
													onBookmark={toggleBookmark}
												/>
											</motion.div>
										))}
									</AnimatePresence>
									{displayedChapters.length === 0 && !loadingChapters && (
										<div className="text-center py-8 text-gray-400 text-sm">
											No chapters found. Try adjusting your filters.
										</div>
									)}
								</div>

								{/* Load More Chapters Button - Outside scrollable container */}
								{displayedChapters.length > visibleChaptersCount && (
									<div className="text-center py-4 mt-4">
										<button
											onClick={showMoreChapters}
											className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#181c20] hover:bg-white/5 text-white text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]"
										>
											<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
											Show More Chapters ({displayedChapters.length - visibleChaptersCount} remaining)
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Mobile Chapters Section */}
					<div className="lg:hidden">
						<div className={`bg-[#181c20] rounded-2xl border border-white/10 transition-all duration-300 ${
							isFiltersCollapsed ? 'p-3 mb-3' : 'p-4 mb-6'
						}`}>
							<div className={`flex items-center justify-between transition-all duration-300 ${
								isFiltersCollapsed ? 'mb-0' : 'mb-4'
							}`}>
								<button 
									onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
									className="flex items-center space-x-2 rounded-lg p-2 -m-2 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
									aria-label={isFiltersCollapsed ? 'Expand filters' : 'Collapse filters'}
								>
									<h2 className="text-white text-lg font-semibold">Chapters</h2>
									<svg 
										className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFiltersCollapsed ? 'rotate-180' : ''}`} 
										fill="none" 
										stroke="currentColor" 
										viewBox="0 0 24 24"
									>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								<div className="flex items-center space-x-2 flex-shrink-0">
									<span className="text-gray-400 text-xs whitespace-nowrap">
										{displayedChapters.length} ch{displayedChapters.length !== 1 ? 's' : ''}
										{allChaptersMeta.length > 0 && allChaptersMeta.length !== displayedChapters.length && (
											<span className="text-gray-500">
												{' '}({allChaptersMeta.length})
											</span>
										)}
									</span>
									{hasActiveFilters && (
										<button
											onClick={clearAllFilters}
											className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-full border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200 flex items-center space-x-1 flex-shrink-0"
										>
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
											</svg>
											<span>Clear</span>
										</button>
									)}
								</div>
							</div>

							{/* Collapsible Filter Content */}
							<AnimatePresence>
								{!isFiltersCollapsed && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.3, ease: 'easeInOut' }}
										className="overflow-hidden"
									>
										{/* Search and Sort Controls */}
										<div className="grid grid-cols-1 gap-3">
											{/* Chapter Search */}
											<div className="relative">
												<input
													type="text"
													placeholder="Search chapters..."
													value={chapterSearch}
													onChange={(e) => setChapterSearch(e.target.value)}
													className="w-full bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors placeholder-gray-400"
												/>
												<svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
												</svg>
											</div>

											{/* Filter Row 1 */}
											<div className="grid grid-cols-2 gap-3">
												{/* Language Filter */}
												<select
													value={selectedLang}
													onChange={(e) => setSelectedLang(e.target.value)}
													className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
												>
													<option value="">All languages</option>
													{availableLangs.map((l) => (
														<option key={l} value={l}>{getLanguageLabel(l)}</option>
													))}
												</select>

												{/* Volume Filter */}
												<select
													value={selectedVolume}
													onChange={(e) => { setSelectedVolume(e.target.value); setSelectedChapter('') }}
													className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
												>
													<option value="">All volumes</option>
													{availableVolumes.map((v) => (
														<option key={v} value={v}>Vol {v}</option>
													))}
												</select>
											</div>

											{/* Filter Row 2 */}
											<div className="grid grid-cols-2 gap-3">
												{/* Sort Order */}
												<select
													value={sortOrder}
													onChange={(e) => setSortOrder(e.target.value)}
													className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
												>
													<option value="desc">Newest first</option>
													<option value="asc">Oldest first</option>
												</select>

												{/* Chapter Filter */}
												<select
													value={selectedChapter}
													onChange={(e) => setSelectedChapter(e.target.value)}
													className="appearance-none bg-white/5 text-white text-sm rounded-full px-3 py-2 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
												>
													<option value="">All chapters</option>
													{availableChapters.map((c) => (
														<option key={c} value={c}>Ch {c}</option>
													))}
												</select>
											</div>

											{/* Additional Filter Options */}
											<div className="flex items-center gap-3">
												<label className="flex items-center space-x-2 cursor-pointer">
													<input
														type="checkbox"
														checked={showOnlyUnread}
														onChange={(e) => setShowOnlyUnread(e.target.checked)}
														className="w-4 h-4 text-blue-600 bg-white/5 border-white/20 rounded-full focus:ring-blue-500 focus:ring-2"
													/>
													<span className="text-gray-300 text-sm">Show only unread</span>
												</label>
											</div>

											{/* Active Filters Summary */}
											{hasActiveFilters && (
												<div className="mt-4 pt-4 border-t border-white/10">
													<div className="flex flex-wrap items-center gap-2">
														<span className="text-gray-400 text-xs font-medium">Active filters:</span>
														{selectedLang && (
															<span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
																{getLanguageLabel(selectedLang)}
															</span>
														)}
														{chapterSearch && (
															<span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
																Search: "{chapterSearch}"
															</span>
														)}
														{showOnlyUnread && (
															<span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">
																Unread only
															</span>
														)}
														{selectedVolume && (
															<span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
																Vol {selectedVolume}
															</span>
														)}
														{selectedChapter && (
															<span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full">
																Ch {selectedChapter}
															</span>
														)}
														{sortOrder !== 'desc' && (
															<span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
																Oldest first
															</span>
														)}
													</div>
												</div>
											)}

											{(loadingChapters || loadingAllVolumes) && (
												<div className="mt-4 flex justify-center">
													<EnhancedLoadingIndicator
														isLoading={true}
														error={null}
														retryCount={chaptersRetryCount}
														onRetry={handleRetryChapters}
														context="chapters"
														className="col-span-full"
														hasContent={allChaptersMeta.length > 0}
													/>
												</div>
											)}
											{loadingAllVolumes && allChaptersMeta.length > 0 && (
												<div className="mt-2 text-center">
													<div className="text-gray-400 text-xs mb-2">
														Loading languages... ({loadingProgress.loaded}/{loadingProgress.total}) - {loadingProgress.currentLang}
													</div>
													<div className="w-full bg-gray-700 rounded-full h-1.5">
														<div 
															className="bg-white-500 h-1.5 rounded-full transition-all duration-300"
															style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
														></div>
													</div>
													<div className="text-gray-500 text-xs mt-1">
														{allChaptersMeta.length} chapters loaded so far
													</div>
												</div>
											)}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>

							{/* Chapter List - Mobile */}
							<div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
								<AnimatePresence mode="popLayout">
									{displayedChapters.slice(0, visibleChaptersCount).map((ch, idx) => (
										<motion.div
											key={ch?.hid || ch?.id || idx}
											layout
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10, scale: 0.98 }}
											transition={{ 
												duration: 0.2, 
												delay: Math.min(idx * 0.01, 0.1),
												layout: { duration: 0.15, ease: "easeOut" }
											}}
										>
											<ChapterRow
												ch={ch}
												isRead={isChapterRead(ch)}
												isBookmarked={isChapterBookmarked(ch)}
												onRead={() => {
													const hid = ch?.hid || ch?.id
													if (hid) {
														markChapterAsRead(hid)
														navigate(`/manga/chapter/${encodeURIComponent(hid)}`)
													}
												}}
												onBookmark={toggleBookmark}
											/>
										</motion.div>
									))}
								</AnimatePresence>
								{displayedChapters.length === 0 && !loadingChapters && (
									<div className="text-center py-8 text-gray-400 text-sm">
										No chapters found. Try adjusting your filters.
									</div>
								)}
							</div>

							{/* Load More Chapters Button - Mobile - Outside scrollable container */}
							{displayedChapters.length > visibleChaptersCount && (
								<div className="text-center py-4 mt-4 pb-20">
									<button
										onClick={showMoreChapters}
										className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#181c20] hover:bg-white/5 text-white text-sm font-medium transition-all duration-200 border border-white/20 hover:border-white/30 hover:scale-[1.02] active:scale-[0.98]"
									>
										<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
										</svg>
										Show More Chapters ({displayedChapters.length - visibleChaptersCount} remaining)
									</button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Cover Gallery Modal */}
			<AnimatePresence>
				{showCoverGallery && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
						onClick={() => setShowCoverGallery(false)}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="bg-white/10 rounded-xl p-6 max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-white text-xl font-semibold">Cover Gallery</h3>
								<button
									onClick={() => setShowCoverGallery(false)}
									className="p-2 hover:bg-white/10 rounded-lg transition-colors"
								>
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{getCovers.map((cover, idx) => (
									<div key={idx} className="group">
										<div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-white/20">
											<img
												src={cover.url}
												alt={`Cover ${cover.volume}`}
												className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
										</div>
										<div className="mt-2 text-center">
											<p className="text-white text-sm font-medium">{cover.volume}</p>
											{cover.description && (
												<p className="text-gray-400 text-xs mt-1">{cover.description}</p>
											)}
										</div>
									</div>
								))}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

// Memoize the component to prevent unnecessary re-renders
const MemoizedMangaDetailsPage = React.memo(MangaDetailsPage, (prevProps, nextProps) => {
	// Only re-render if essential props change
	return true // No props to compare, so always return true to prevent re-renders
});

export default MemoizedMangaDetailsPage
